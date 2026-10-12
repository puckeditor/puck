import type {
  File,
  Function as FunctionNode,
  Node,
  ObjectExpression,
  TSType,
} from "@babel/types";
import { unwrapExpression, walk } from "./parse";
import { findProperty, keyName, quoteOf } from "./config-object";
import type { TextEdit } from "./splice";
import { applyEdits } from "./splice";
import type { ConfigObject, PuckField } from "./puck-fields";
import { findConfigObject, listFields } from "./puck-fields";
import { PLUGIN_ASSETS_PACKAGE } from "../constants";

export interface AssetFieldManual {
  field: string;
  detail: string;
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

const typeLiteralMembers = (type: TSType | null | undefined) => {
  if (!type) return null;
  if (type.type === "TSTypeLiteral") return type.members;
  return null;
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

/** The local `type Props = {...}` or `interface Props {...}` members */
const propsMembers = (ast: File, name: string): Node[] | null => {
  for (const statement of ast.program.body) {
    const decl =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    if (decl?.type === "TSTypeAliasDeclaration" && decl.id.name === name)
      return typeLiteralMembers(decl.typeAnnotation);
    if (decl?.type === "TSInterfaceDeclaration" && decl.id.name === name)
      return decl.body.body;
  }
  return null;
};

/** `image: string` in the props type becomes `image: AssetValue` */
const typeEdit = (
  { ast, propsType }: ConfigObject,
  field: PuckField
): TextEdit | null => {
  if (!propsType || field.component === "root") return null;
  let members = propsMembers(ast, propsType);
  if (!members) return null;
  let type = memberType(members, field.component);

  for (const segment of field.path) {
    members = typeLiteralMembers(type) ?? [];
    type = memberType(members, segment.key);
    if (!type) return null;
    if (segment.array) {
      const item =
        type.type === "TSArrayType"
          ? type.elementType
          : type.type === "TSTypeReference" &&
            type.typeName.type === "Identifier" &&
            type.typeName.name === "Array"
          ? type.typeParameters?.params[0] ?? null
          : null;
      if (!item) return null;
      type = item;
    }
  }

  return type?.type === "TSStringKeyword"
    ? { start: type.start!, end: type.end!, text: "AssetValue" }
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

/** Whether `node` is where `name` is read, rather than a key or a binding */
const isRead = (node: Node, parent: Node | null) => {
  if (!parent) return true;
  if (
    (parent.type === "MemberExpression" ||
      parent.type === "OptionalMemberExpression") &&
    parent.property === node &&
    !parent.computed
  )
    return false;
  if (
    parent.type === "ObjectProperty" &&
    parent.key === node &&
    !parent.shorthand
  )
    return false;
  if (
    parent.type === "ObjectProperty" &&
    parent.shorthand &&
    parent.value !== node
  )
    return false;
  if (parent.type === "JSXAttribute" || parent.type === "JSXMemberExpression")
    return false;
  if (parent.type === "VariableDeclarator" && parent.id === node) return false;
  if (parent.type === "AssignmentPattern" && parent.left === node) return false;
  if (parent.type === "ObjectPattern" || parent.type === "ArrayPattern")
    return false;
  return true;
};

/**
 * Wraps each read of the field's value in the component's render with
 * assetSrc(), so `src={image}` keeps rendering a URL. Returns null when the
 * render passes its props somewhere the CLI can't follow.
 */
const renderEdits = (code: string, field: PuckField): TextEdit[] | null => {
  const render = renderFunction(field.owner);
  if (!render) return field.component === "root" ? [] : null;
  const key = field.path[field.path.length - 1].key;
  const topLevel = field.path.length === 1;
  const [param] = render.params;

  // Names the value is read through: destructured, or nested in an item
  const locals = new Set<string>();
  const bad: string[] = [];
  let props: string | null = null;

  if (param?.type === "Identifier") props = param.name;
  else if (param?.type === "ObjectPattern") {
    for (const p of param.properties) {
      if (p.type === "RestElement") {
        if (p.argument.type === "Identifier") props = p.argument.name;
        continue;
      }
      if (topLevel && keyName(p) === key) {
        const value = p.value;
        if (value.type === "Identifier") locals.add(value.name);
        else bad.push("its value is destructured with a default or pattern");
      }
    }
  } else if (param) {
    return null;
  }

  // Nested values are read as item.key, or destructured from items
  walk(render.body, (node, parent) => {
    if (
      !topLevel &&
      node.type === "ObjectPattern" &&
      parent?.type !== "VariableDeclarator"
    ) {
      for (const p of node.properties) {
        if (p.type === "ObjectProperty" && keyName(p) === key) {
          if (p.value.type === "Identifier") locals.add(p.value.name);
          else bad.push("its value is destructured with a default or pattern");
        }
      }
    }
    if (
      node.type === "VariableDeclarator" &&
      node.id.type === "ObjectPattern"
    ) {
      for (const p of node.id.properties) {
        if (p.type === "ObjectProperty" && keyName(p) === key) {
          if (p.value.type === "Identifier") locals.add(p.value.name);
          else bad.push("its value is destructured with a default or pattern");
        }
      }
    }
  });

  const edits: TextEdit[] = [];
  let passedOn = false;

  walk(render.body, (node, parent) => {
    // props.image, or item.logo for nested fields
    if (
      (node.type === "MemberExpression" ||
        node.type === "OptionalMemberExpression") &&
      !node.computed &&
      node.property.type === "Identifier" &&
      node.property.name === key &&
      (topLevel
        ? node.object.type === "Identifier" && node.object.name === props
        : true) &&
      !(
        parent?.type === "MemberExpression" ||
        parent?.type === "OptionalMemberExpression"
      ) &&
      !(parent?.type === "AssignmentExpression" && parent.left === node)
    ) {
      edits.push({
        start: node.start!,
        end: node.end!,
        text: `${HELPER}(${text(code, node)})`,
      });
    }

    if (node.type === "Identifier" && locals.has(node.name)) {
      if (!isRead(node, parent)) return;
      if (parent?.type === "ObjectProperty" && parent.shorthand) {
        edits.push({
          start: parent.start!,
          end: parent.end!,
          text: `${node.name}: ${HELPER}(${node.name})`,
        });
      } else {
        edits.push({
          start: node.start!,
          end: node.end!,
          text: `${HELPER}(${node.name})`,
        });
      }
    }

    // <Hero {...props} /> or fn(props): the value is read somewhere else
    if (props && node.type === "Identifier" && node.name === props) {
      const spread =
        parent?.type === "JSXSpreadAttribute" ||
        parent?.type === "SpreadElement";
      const argument =
        parent?.type === "CallExpression" &&
        parent.arguments.includes(node as never);
      const attribute = parent?.type === "JSXExpressionContainer";
      if (spread || argument || attribute) passedOn = true;
    }
  });

  if (bad.length || passedOn) return null;
  // A nested value has to be read somewhere the CLI can see
  if (!edits.length && !topLevel) return null;
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
    if (type) {
      edits.push(type);
      usesType = true;
    }

    const reads = renderEdits(code, field);
    if (reads === null) {
      manual.push({
        field: id,
        detail: `${field.component}'s render passes its props on, so it still reads ${id} as a URL`,
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

  return { status: "edited", code: applyEdits(code, edits), manual };
};
