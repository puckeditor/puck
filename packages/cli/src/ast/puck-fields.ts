import type {
  CallExpression,
  File,
  Node,
  ObjectExpression,
} from "@babel/types";
import { tryParseModule, unwrapExpression } from "./parse";
import { findProperty, keyName } from "./config-object";
import { lineOf } from "./splice";

export interface ConfigObject {
  ast: File;
  config: ObjectExpression;
  /** The type the config's props come from, e.g. Props in Config<Props> */
  propsType: string | null;
}

/** The type argument of `Config<Props>`, from an annotation or `satisfies` */
const propsTypeOf = (node: Node | null | undefined): string | null => {
  if (!node) return null;
  const type = node.type === "TSTypeAnnotation" ? node.typeAnnotation : node;
  if (
    type.type !== "TSTypeReference" ||
    type.typeName.type !== "Identifier" ||
    type.typeName.name !== "Config"
  )
    return null;
  const [props] = type.typeParameters?.params ?? [];
  return props?.type === "TSTypeReference" &&
    props.typeName.type === "Identifier"
    ? props.typeName.name
    : null;
};

/** The `satisfies Config<Props>` or `as Config<Props>` on an expression */
const assertedType = (node: Node): Node | null => {
  let current = node;
  while (
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "ParenthesizedExpression"
  ) {
    if (current.type !== "ParenthesizedExpression")
      return current.typeAnnotation;
    current = current.expression;
  }
  return null;
};

/**
 * The Puck config object literal in a module: its default export, or a
 * top-level `config` constant (exported or not), unwrapping `satisfies`, `as`
 * and `defineConfig()`
 */
export const findConfigObject = (
  code: string,
  filename: string
): ({ ok: true } & ConfigObject) | { ok: false; detail: string } => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { ok: false, detail: `Could not parse ${filename}` };

  const constants = new Map<string, { init: Node; id: Node }>();
  for (const statement of ast.program.body) {
    const decl =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    if (decl?.type !== "VariableDeclaration" || decl.kind !== "const") continue;
    for (const d of decl.declarations) {
      if (d.id.type === "Identifier" && d.init)
        constants.set(d.id.name, { init: d.init, id: d.id });
    }
  }

  const exportDefault = ast.program.body.find(
    (s) => s.type === "ExportDefaultDeclaration"
  );
  let expression: Node | null = null;
  let propsType: string | null = null;
  if (exportDefault?.type === "ExportDefaultDeclaration") {
    expression = exportDefault.declaration as Node;
  }
  if (!expression || unwrapExpression(expression).type === "Identifier") {
    const name =
      expression && unwrapExpression(expression).type === "Identifier"
        ? (unwrapExpression(expression) as { name: string }).name
        : "config";
    const constant = constants.get(name);
    if (!constant)
      return {
        ok: false,
        detail: expression
          ? `${name} isn't a constant in ${filename}`
          : `${filename} has no default export or config constant`,
      };
    expression = constant.init;
    propsType = propsTypeOf(
      (constant.id as { typeAnnotation?: Node }).typeAnnotation
    );
  }

  propsType ??= propsTypeOf(assertedType(expression));
  let config = unwrapExpression(expression);
  if (
    config.type === "CallExpression" &&
    config.callee.type === "Identifier" &&
    config.callee.name === "defineConfig" &&
    config.arguments.length === 1
  ) {
    // defineConfig<Props>(...)
    const [props] = config.typeParameters?.params ?? [];
    if (
      props?.type === "TSTypeReference" &&
      props.typeName.type === "Identifier"
    )
      propsType ??= props.typeName.name;
    config = unwrapExpression(config.arguments[0] as Node);
  }

  if (config.type !== "ObjectExpression")
    return {
      ok: false,
      detail: "The config is not an object literal (e.g. it's a function)",
    };
  return { ok: true, ast, config, propsType };
};

export type PathSegment = { key: string; array: boolean };

export interface PuckField {
  /** e.g. Hero.image, Logos.items[].logo or root.ogImage */
  id: string;
  /** The component, or "root" */
  component: string;
  /** From the component's fields down to this one; `array` marks array fields passed through */
  path: PathSegment[];
  /** The field's type, e.g. "text", or null when it isn't a literal */
  type: string | null;
  /** The field's object literal, or its assetField() call */
  node: ObjectExpression | CallExpression;
  /** The component's (or root's) object literal */
  owner: ObjectExpression;
  line: number;
  /**
   * Text and textarea fields hold a URL; object fields with `src` hold
   * { src, ... }; "asset" fields already use assetField()
   */
  shape: "string" | "object" | "asset" | null;
  /** How strongly the field's name suggests an image or video */
  match: "strong" | "weak" | null;
}

/** Names that hold an image or video */
const STRONG =
  /image|img|photo|picture|logo|avatar|thumb|banner|poster|video|^src$|Src$/i;
/** Names that often do, but may be colours, icon names or text */
const WEAK = /background|^bg|Bg$|cover|icon|media/i;

const idOf = (component: string, path: PathSegment[]) =>
  [component, path.map((s) => `${s.key}${s.array ? "[]" : ""}`).join(".")].join(
    "."
  );

const stringValue = (obj: ObjectExpression, key: string) => {
  const prop = findProperty(obj, key);
  return prop?.value.type === "StringLiteral" ? prop.value.value : null;
};

const isAssetFieldCall = (node: Node) =>
  node.type === "CallExpression" &&
  node.callee.type === "Identifier" &&
  node.callee.name === "assetField";

/** `assetField()`, or `{ ...assetField(), ai: ... }` */
const isAssetField = (node: Node) =>
  isAssetFieldCall(node) ||
  (node.type === "ObjectExpression" &&
    node.properties.some(
      (p) => p.type === "SpreadElement" && isAssetFieldCall(p.argument)
    ));

const objectValue = (obj: ObjectExpression, key: string) => {
  const prop = findProperty(obj, key);
  const value = prop && unwrapExpression(prop.value);
  return value?.type === "ObjectExpression" ? value : null;
};

/** Every field with an object literal in the config, depth first */
export const listFields = (
  code: string,
  { config }: ConfigObject
): PuckField[] => {
  const fields: PuckField[] = [];

  const visit = (
    component: string,
    owner: ObjectExpression,
    container: ObjectExpression,
    parent: PathSegment[]
  ) => {
    for (const property of container.properties) {
      const key = keyName(property);
      if (!key || property.type !== "ObjectProperty") continue;
      const node = unwrapExpression(property.value);
      const match = STRONG.test(key)
        ? "strong"
        : WEAK.test(key)
        ? "weak"
        : null;
      const line = lineOf(code, property.start!);

      if (isAssetField(node)) {
        fields.push({
          id: idOf(component, [...parent, { key, array: false }]),
          component,
          path: [...parent, { key, array: false }],
          type: "custom",
          node: node as ObjectExpression | CallExpression,
          owner,
          line,
          shape: "asset",
          match,
        });
        continue;
      }
      if (node.type !== "ObjectExpression") continue;

      const type = stringValue(node, "type");
      const array = type === "array";
      const path = [...parent, { key, array }];
      const sub = objectValue(node, array ? "arrayFields" : "objectFields");
      const shape =
        type === "text" || type === "textarea"
          ? "string"
          : type === "object" && sub && findProperty(sub, "src")
          ? "object"
          : null;
      fields.push({
        id: idOf(component, path),
        component,
        path,
        type,
        node,
        owner,
        line,
        shape,
        match,
      });
      // An object field shaped like an asset is one field, not its parts
      if (sub && shape !== "object") visit(component, owner, sub, path);
    }
  };

  const components = objectValue(config, "components");
  for (const property of components?.properties ?? []) {
    const name = keyName(property);
    if (!name || property.type !== "ObjectProperty") continue;
    const component = unwrapExpression(property.value);
    if (component.type !== "ObjectExpression") continue;
    const own = objectValue(component, "fields");
    if (own) visit(name, component, own, []);
  }

  const root = objectValue(config, "root");
  const rootFields = root && objectValue(root, "fields");
  if (root && rootFields) visit("root", root, rootFields, []);

  return fields;
};

/** Fields assets could replace, whose names suggest images or videos */
export const assetCandidates = (fields: PuckField[]) =>
  fields.filter(
    (f) => (f.shape === "string" || f.shape === "object") && f.match
  );
