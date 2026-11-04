import type {
  File,
  Function as FunctionNode,
  Node,
  ObjectExpression,
  TSType,
} from "@babel/types";
import { childNodes, unwrapExpression } from "./parse";
import { findProperty, keyName, quoteOf } from "./config-object";
import type { TextEdit } from "./splice";
import { applyEdits } from "./splice";
import type { ConfigObject, PuckField } from "./puck-fields";
import { findConfigObject, listFields } from "./puck-fields";
import { PLUGIN_ASSETS_PACKAGE } from "../constants";

export interface AssetFieldManual {
  /** What the CLI couldn't change: the field's render, or its props type */
  kind: "render" | "type";
  field: string;
  detail: string;
  instructions: string;
  snippet: string;
}

export type AssetFieldsResult =
  | {
      status: "edited";
      code: string;
      /** Changes the CLI couldn't make, e.g. renders it couldn't follow */
      manual: AssetFieldManual[];
    }
  | { status: "unchanged" }
  | { status: "error"; detail: string };

const HELPER = "assetSrc";

const helperCode = (ts: boolean, semi: string) =>
  ts
    ? `/** An asset's URL, including URLs stored before the field held assets */
const ${HELPER} = (value?: AssetValue | string) =>
  typeof value === "string" ? value : value?.src${semi}`
    : `/** An asset's URL, including URLs stored before the field held assets */
const ${HELPER} = (value) =>
  typeof value === "string" ? value : value?.src${semi}`;

const RENDER_SNIPPET = `// The field now holds { src, alt, ... } instead of a URL
const ${HELPER} = (value?: AssetValue | string) =>
  typeof value === "string" ? value : value?.src;

<img src={${HELPER}(image)} />
`;

const isVideo = (key: string) => /video/i.test(key);

const text = (code: string, node: Node) => code.slice(node.start!, node.end!);

/** `assetField({ ... })`, keeping the field's label and any other options */
const assetFieldCall = (
  code: string,
  field: PuckField,
  node: ObjectExpression,
  q: string
) => {
  const key = field.path[field.path.length - 1].key;
  const label = findProperty(node, "label");
  const options = [
    ...(label ? [text(code, label)] : []),
    `accept: [${q}${isVideo(key) ? "video/*" : "image/*"}${q}]`,
  ];
  const call = `assetField({ ${options.join(", ")} })`;
  const kept = node.properties.filter((p) => {
    const name = keyName(p);
    return !["type", "label", "objectFields"].includes(name ?? "");
  });
  return kept.length
    ? `{ ...${call}, ${kept.map((p) => text(code, p)).join(", ")} }`
    : call;
};

/** A default value as an asset: "url" becomes { src: "url" } */
const assetDefault = (code: string, value: Node): string | null => {
  const inner = unwrapExpression(value);
  if (inner.type === "ObjectExpression") return null;
  if (inner.type === "StringLiteral" && inner.value === "") return "undefined";
  if (inner.type === "Identifier" && inner.name === "undefined") return null;
  return `{ src: ${text(code, value)} }`;
};

/** Every object along `keys` under `start`, stepping into array items */
const objectsAt = (
  start: ObjectExpression | null,
  segments: { key: string; array: boolean }[]
): ObjectExpression[] => {
  let current: ObjectExpression[] = start ? [start] : [];
  for (const segment of segments) {
    const next: ObjectExpression[] = [];
    for (const obj of current) {
      const prop = findProperty(obj, segment.key);
      const value = prop && unwrapExpression(prop.value);
      if (!value) continue;
      if (segment.array && value.type === "ArrayExpression") {
        for (const item of value.elements) {
          const el = item && unwrapExpression(item);
          if (el?.type === "ObjectExpression") next.push(el);
        }
      } else if (!segment.array && value.type === "ObjectExpression") {
        next.push(value);
      }
    }
    current = next;
  }
  return current;
};

const objectProp = (obj: ObjectExpression, key: string) => {
  const value = findProperty(obj, key)?.value;
  const inner = value && unwrapExpression(value);
  return inner?.type === "ObjectExpression" ? inner : null;
};

/** Default values for the field, in defaultProps and defaultItemProps */
const defaultEdits = (
  code: string,
  field: PuckField,
  fields: PuckField[]
): TextEdit[] => {
  const key = field.path[field.path.length - 1].key;
  const parents = field.path.slice(0, -1);
  const holders = objectsAt(objectProp(field.owner, "defaultProps"), parents);

  // Array fields' defaultItemProps hold items for everything below them
  parents.forEach((segment, i) => {
    if (!segment.array) return;
    const arrayField = fields.find(
      (f) =>
        f.component === field.component &&
        f.path.length === i + 1 &&
        f.path.every((s, j) => s.key === field.path[j].key)
    );
    const itemDefaults =
      arrayField?.node.type === "ObjectExpression"
        ? objectProp(arrayField.node, "defaultItemProps")
        : null;
    holders.push(...objectsAt(itemDefaults, parents.slice(i + 1)));
  });

  const edits: TextEdit[] = [];
  for (const holder of holders) {
    const prop = findProperty(holder, key);
    if (!prop || prop.shorthand) continue;
    const next = assetDefault(code, prop.value);
    if (next !== null)
      edits.push({
        start: prop.value.start!,
        end: prop.value.end!,
        text: next,
      });
  }
  return edits;
};

const memberType = (members: Node[], key: string): TSType | null => {
  for (const m of members) {
    if (
      m.type === "TSPropertySignature" &&
      !m.computed &&
      ((m.key.type === "Identifier" && m.key.name === key) ||
        (m.key.type === "StringLiteral" && m.key.value === key))
    )
      return m.typeAnnotation?.typeAnnotation ?? null;
  }
  return null;
};

const typeLiteralMembers = (
  ast: File,
  type: TSType | null | undefined
): Node[] | null => {
  if (type?.type === "TSTypeLiteral") return type.members;
  // A local type's name, e.g. Hero: HeroProps
  if (type?.type === "TSTypeReference" && type.typeName.type === "Identifier")
    return propsMembers(ast, type.typeName.name);
  return null;
};

/** The local `type Props = {...}` or `interface Props {...}` members */
const propsMembers = (ast: File, name: string): Node[] | null => {
  for (const statement of ast.program.body) {
    const decl =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    if (decl?.type === "TSTypeAliasDeclaration" && decl.id.name === name)
      return typeLiteralMembers(ast, decl.typeAnnotation);
    if (decl?.type === "TSInterfaceDeclaration" && decl.id.name === name)
      return decl.body.body;
  }
  return null;
};

/**
 * `image: string` in the props type becomes `image: AssetValue`. Returns
 * "unresolved" when the type can't be followed to the field, e.g. it's
 * imported or generic.
 */
const typeEdit = (
  { ast, propsType }: ConfigObject,
  field: PuckField
): TextEdit | "unresolved" | null => {
  if (!propsType || field.component === "root") return null;
  let members = propsMembers(ast, propsType);
  if (!members) return "unresolved";
  let type = memberType(members, field.component);

  for (const segment of field.path) {
    members = typeLiteralMembers(ast, type);
    if (!members) return "unresolved";
    type = memberType(members, segment.key);
    if (!type) return "unresolved";
    if (segment.array) {
      const item =
        type.type === "TSArrayType"
          ? type.elementType
          : type.type === "TSTypeReference" &&
            type.typeName.type === "Identifier" &&
            type.typeName.name === "Array"
          ? type.typeParameters?.params[0] ?? null
          : null;
      if (!item) return "unresolved";
      type = item;
    }
  }

  // string, or the string in string | undefined
  const string =
    type?.type === "TSUnionType"
      ? type.types.find((t) => t.type === "TSStringKeyword")
      : type;
  return string?.type === "TSStringKeyword"
    ? { start: string.start!, end: string.end!, text: "AssetValue" }
    : null;
};

const renderFunction = (owner: ObjectExpression): FunctionNode | null => {
  const prop = owner.properties.find(
    (p) =>
      keyName(p) === "render" ||
      (p.type === "ObjectMethod" &&
        p.key.type === "Identifier" &&
        p.key.name === "render")
  );
  if (!prop) return null;
  if (prop.type === "ObjectMethod") return prop;
  if (prop.type !== "ObjectProperty") return null;
  const value = unwrapExpression(prop.value);
  return value.type === "ArrowFunctionExpression" ||
    value.type === "FunctionExpression"
    ? value
    : null;
};

/** Array methods whose callback's first parameter is an item */
const ITEM_CALLBACK = /^(map|flatMap|forEach|filter|find|findLast|some|every)$/;

/**
 * What a name or expression in render holds: an object holding
 * path[depth], the array at path[depth], or the field's value
 */
type Ref = { kind: "holder" | "array"; depth: number } | { kind: "value" };
type Scope = Map<string, Ref>;

/** Where reading a value hands it to code the CLI can't see */
const passesOn = (node: Node, parent: Node) =>
  parent.type === "JSXSpreadAttribute" ||
  parent.type === "SpreadElement" ||
  parent.type === "JSXExpressionContainer" ||
  ((parent.type === "CallExpression" ||
    parent.type === "OptionalCallExpression" ||
    parent.type === "NewExpression") &&
    parent.arguments.includes(node as never));

/**
 * Wraps each read of the field's value in the component's render with
 * assetSrc(), so `src={image}` keeps rendering a URL. Follows the value
 * through destructuring and array callbacks, respecting names that shadow
 * it. Returns null when the render passes its props somewhere the CLI can't
 * follow.
 */
const renderEdits = (code: string, field: PuckField): TextEdit[] | null => {
  const render = renderFunction(field.owner);
  if (!render) return field.component === "root" ? [] : null;
  const { path } = field;
  const edits: TextEdit[] = [];
  let unfollowed = false;

  /** What reading `.key` on `ref` gives */
  const member = (ref: Ref | null, key: string | null): Ref | null => {
    if (ref?.kind !== "holder" || path[ref.depth].key !== key) return null;
    if (ref.depth === path.length - 1) return { kind: "value" };
    return path[ref.depth].array
      ? { kind: "array", depth: ref.depth }
      : { kind: "holder", depth: ref.depth + 1 };
  };

  const item = (ref: Ref | null): Ref | null =>
    ref?.kind === "array" ? { kind: "holder", depth: ref.depth + 1 } : null;

  const refOf = (node: Node, scope: Scope): Ref | null => {
    const inner = unwrapExpression(node);
    if (inner.type === "Identifier") return scope.get(inner.name) ?? null;
    if (
      inner.type !== "MemberExpression" &&
      inner.type !== "OptionalMemberExpression"
    )
      return null;
    const object = refOf(inner.object, scope);
    const { property } = inner;
    if (!inner.computed)
      return member(
        object,
        property.type === "Identifier" ? property.name : null
      );
    // props["image"], or items[0]
    return property.type === "StringLiteral"
      ? member(object, property.value)
      : item(object);
  };

  const wrap = (node: Node, prefix = "") =>
    void edits.push({
      start: node.start!,
      end: node.end!,
      text: `${prefix}${HELPER}(${text(code, node)})`,
    });

  /** Binds the names in a parameter or declaration to what they hold */
  const bind = (pattern: Node, ref: Ref | null, scope: Scope): void => {
    if (pattern.type === "Identifier") {
      if (ref) scope.set(pattern.name, ref);
      else scope.delete(pattern.name);
      return;
    }
    // A default or a pattern doesn't hold the value as it's stored
    if (ref?.kind === "value") unfollowed = true;
    if (pattern.type === "AssignmentPattern") bind(pattern.left, ref, scope);
    if (pattern.type === "RestElement") bind(pattern.argument, null, scope);
    if (pattern.type === "ArrayPattern")
      for (const el of pattern.elements) if (el) bind(el, item(ref), scope);
    if (pattern.type === "ObjectPattern")
      for (const p of pattern.properties) {
        if (p.type === "ObjectProperty")
          bind(p.value, member(ref, keyName(p)), scope);
        // { title, ...rest } leaves the rest holding the field
        else bind(p.argument, ref?.kind === "holder" ? ref : null, scope);
      }
  };

  const visitFunction = (
    fn: FunctionNode,
    parent: Node,
    outer: Scope,
    first: Ref | null = null
  ) => {
    // items.map((item) => ...): the callback's first parameter is an item
    const callee =
      (parent.type === "CallExpression" ||
        parent.type === "OptionalCallExpression") &&
      parent.arguments[0] === fn
        ? parent.callee
        : null;
    if (
      (callee?.type === "MemberExpression" ||
        callee?.type === "OptionalMemberExpression") &&
      callee.property.type === "Identifier" &&
      ITEM_CALLBACK.test(callee.property.name)
    )
      first = item(refOf(callee.object, outer));

    const scope = new Map(outer);
    fn.params.forEach((param, i) => bind(param, i ? null : first, scope));
    visit(fn.body, fn, scope);
  };

  const visit = (node: Node, parent: Node, scope: Scope): void => {
    // Types never read values
    if (node.type.startsWith("TS")) {
      if ("expression" in node) visit(node.expression as Node, node, scope);
      return;
    }
    if ("params" in node)
      return visitFunction(node as FunctionNode, parent, scope);

    switch (node.type) {
      case "Identifier":
      case "MemberExpression":
      case "OptionalMemberExpression": {
        const ref = refOf(node, scope);
        if (ref?.kind === "value") return wrap(node);
        if (ref && passesOn(node, parent)) unfollowed = true;
        if (node.type === "Identifier") return;
        visit(node.object, node, scope);
        if (node.computed) visit(node.property, node, scope);
        return;
      }
      case "ObjectProperty":
        if (node.shorthand && refOf(node.value, scope)?.kind === "value")
          return wrap(node.value, `${text(code, node.value)}: `);
        if (node.computed) visit(node.key, node, scope);
        return visit(node.value, node, scope);
      case "VariableDeclarator": {
        // const image = props.image is followed as the value, not read
        const ref = node.init ? refOf(node.init, scope) : null;
        if (node.init && !ref) visit(node.init, node, scope);
        return bind(node.id, ref, scope);
      }
      case "AssignmentExpression":
        visit(node.right, node, scope);
        return bind(node.left, null, scope);
      case "ForOfStatement":
        visit(node.right, node, scope);
        scope = new Map(scope);
        bind(
          node.left.type === "VariableDeclaration"
            ? node.left.declarations[0].id
            : node.left,
          item(refOf(node.right, scope)),
          scope
        );
        return visit(node.body, node, scope);
      case "CatchClause":
        scope = new Map(scope);
        if (node.param) bind(node.param, null, scope);
        break;
      case "BlockStatement":
        scope = new Map(scope);
    }
    for (const child of childNodes(node)) visit(child, node, scope);
  };

  const [param] = render.params;
  if (param && param.type !== "Identifier" && param.type !== "ObjectPattern")
    return null;
  visitFunction(render, render, new Map(), { kind: "holder", depth: 0 });

  if (unfollowed) return null;
  // A nested value has to be read somewhere the CLI can see
  if (!edits.length && path.length > 1) return null;
  return edits;
};

/**
 * Named imports from plugin-assets: merged into an existing import, or new
 * import lines for the caller to insert
 */
const assetImports = (
  code: string,
  ast: File,
  names: string[],
  typeNames: string[],
  semi: string
) => {
  const q = quoteOf(code);
  const imports = ast.program.body.filter(
    (s) => s.type === "ImportDeclaration"
  );
  const fromAssets = imports.filter(
    (s) =>
      s.type === "ImportDeclaration" && s.source.value === PLUGIN_ASSETS_PACKAGE
  );
  const have = new Set(
    fromAssets.flatMap((s) =>
      s.type === "ImportDeclaration"
        ? s.specifiers.map((sp) => sp.local.name)
        : []
    )
  );
  const merges: TextEdit[] = [];
  const lines: string[] = [];

  const add = (wanted: string[], typeOnly: boolean) => {
    const missing = wanted.filter((n) => !have.has(n));
    if (!missing.length) return;
    const existing = fromAssets.find(
      (s) =>
        s.type === "ImportDeclaration" &&
        (s.importKind === "type") === typeOnly &&
        s.specifiers.length > 0 &&
        s.specifiers.every((sp) => sp.type === "ImportSpecifier")
    );
    if (existing?.type === "ImportDeclaration") {
      const at = existing.specifiers[existing.specifiers.length - 1].end!;
      merges.push({
        start: at,
        end: at,
        text: missing.map((n) => `, ${n}`).join(""),
      });
      return;
    }
    lines.push(
      `import ${typeOnly ? "type " : ""}{ ${missing.join(
        ", "
      )} } from ${q}${PLUGIN_ASSETS_PACKAGE}${q}${semi}`
    );
  };
  add(names, false);
  add(typeNames, true);
  return { merges, lines };
};

/**
 * Switches the chosen fields to assetField(): the field, its defaults, its
 * props type and, for fields that held a URL, the reads in its render
 */
export const toAssetFields = (
  code: string,
  filename: string,
  ids: string[]
): AssetFieldsResult => {
  const found = findConfigObject(code, filename);
  if (!found.ok) return { status: "error", detail: found.detail };
  const fields = listFields(code, found);
  const ts = /\.tsx?$/.test(filename);
  const q = quoteOf(code);
  const imports = found.ast.program.body.filter(
    (s) => s.type === "ImportDeclaration"
  );
  const lastImport = imports[imports.length - 1];
  const semi = !lastImport || code[lastImport.end! - 1] === ";" ? ";" : "";

  const edits: TextEdit[] = [];
  const manual: AssetFieldManual[] = [];
  let wrapped = false;
  let usesType = false;

  for (const id of ids) {
    const field = fields.find((f) => f.id === id);
    // Fields already using assetField() have nothing left to change here
    if (!field || field.shape === null || field.shape === "asset") continue;
    if (field.node.type !== "ObjectExpression") continue;

    edits.push({
      start: field.node.start!,
      end: field.node.end!,
      text: assetFieldCall(code, field, field.node, q),
    });

    // { src, alt } objects already have an asset's shape
    if (field.shape === "object") continue;

    edits.push(...defaultEdits(code, field, fields));
    const type = ts ? typeEdit(found, field) : null;
    if (type === "unresolved") {
      manual.push({
        kind: "type",
        field: id,
        detail: `The CLI couldn't find ${id} in ${found.propsType}, so it may still be typed as a string`,
        instructions: `Type ${id} as AssetValue in ${found.propsType}.`,
        snippet: `${field.path[field.path.length - 1].key}: AssetValue;\n`,
      });
      // The import is ready for the manual change
      usesType = true;
    } else if (type) {
      edits.push(type);
      usesType = true;
    }

    const reads = renderEdits(code, field);
    if (reads === null) {
      manual.push({
        kind: "render",
        field: id,
        detail: `${field.component}'s render passes its props on, so it still reads ${id} as a URL`,
        instructions: `${id} now holds { src, alt, ... }. Read its URL with ${HELPER}() wherever it's rendered.`,
        snippet: RENDER_SNIPPET,
      });
    } else if (reads.length) {
      edits.push(...reads);
      wrapped = true;
    }
  }

  if (!edits.length) return { status: "unchanged" };

  const helperDefined = found.ast.program.body.some(
    (s) =>
      s.type === "VariableDeclaration" &&
      s.declarations.some(
        (d) => d.id.type === "Identifier" && d.id.name === HELPER
      )
  );
  const addHelper = wrapped && !helperDefined;
  if (addHelper && ts) usesType = true;

  const { merges, lines } = assetImports(
    code,
    found.ast,
    ["assetField"],
    usesType ? ["AssetValue"] : [],
    semi
  );
  edits.push(...merges);
  // New imports, then the helper, after the last import
  const added = [
    ...(lines.length ? [lines.join("\n")] : []),
    ...(addHelper ? [`\n${helperCode(ts, semi)}`] : []),
  ].join("\n");
  if (added) {
    const at = lastImport ? lastImport.end! : 0;
    edits.push({
      start: at,
      end: at,
      text: lastImport ? `\n${added}` : `${added}\n\n`,
    });
  }

  try {
    return { status: "edited", code: applyEdits(code, edits), manual };
  } catch {
    return {
      status: "error",
      detail: `Couldn't switch ${ids.join(
        ", "
      )} together; try them one at a time`,
    };
  }
};
