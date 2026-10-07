import type { File, JSXOpeningElement, Node } from "@babel/types";
import { tryParseModule, unwrapExpression, walk } from "./parse";
import { findImportLocal } from "./imports";
import { indentationAt, lineOf } from "./splice";
import type { ConfigEditResult } from "./config-object";
import { appendAfterLast, quoteOf } from "./config-object";
import { CORE_PACKAGE } from "../constants";

export interface PuckPlugin {
  /** The plugin factory, e.g. createAuthPlugin */
  factory: string;
  source: string;
  /** The module-level constant holding the plugin, e.g. authPlugin */
  local: string;
  /** Stylesheet imported alongside it */
  css?: string;
}

const isPuckElement = (node: Node, puck: string): node is JSXOpeningElement =>
  node.type === "JSXOpeningElement" &&
  node.name.type === "JSXIdentifier" &&
  node.name.name === puck;

/** The array a `plugins={...}` value refers to, inline or as a module-level const */
const pluginArray = (ast: File, value: Node) => {
  const list = unwrapExpression(value);
  if (list.type === "ArrayExpression") return list;
  if (list.type !== "Identifier") return null;

  for (const statement of ast.program.body) {
    const decl =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    if (decl?.type !== "VariableDeclaration") continue;
    for (const d of decl.declarations) {
      if (d.id.type !== "Identifier" || d.id.name !== list.name || !d.init)
        continue;
      const init = unwrapExpression(d.init);
      return init.type === "ArrayExpression" ? init : null;
    }
  }
  return null;
};

/**
 * Adds a plugin to the `<Puck>` editor in a file: imports and creates it at
 * the top level, then appends it to `plugins`, adding the prop if needed.
 */
export const ensurePuckPlugin = (
  code: string,
  filename: string,
  plugin: PuckPlugin
): ConfigEditResult => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { status: "manual", detail: `Could not parse ${filename}` };

  if (findImportLocal(ast, code, plugin.source, plugin.factory))
    return { status: "exists" };

  const puck = findImportLocal(ast, code, CORE_PACKAGE, "Puck");
  const elements: JSXOpeningElement[] = [];
  if (puck)
    walk(ast.program, (n) => isPuckElement(n, puck) && elements.push(n));
  if (elements.length !== 1) {
    return {
      status: "manual",
      detail: puck
        ? "The file doesn't render exactly one <Puck> editor"
        : `<Puck> isn't imported from ${CORE_PACKAGE}`,
    };
  }
  const element = elements[0];

  const edits: { at: number; end?: number; text: string }[] = [];
  const attr = element.attributes.find(
    (a) =>
      a.type === "JSXAttribute" &&
      a.name.type === "JSXIdentifier" &&
      a.name.name === "plugins"
  );

  if (!attr) {
    const name = element.name;
    const first = element.attributes[0];
    const multiline =
      first && lineOf(code, first.start!) !== lineOf(code, name.start!);
    edits.push({
      at: name.end!,
      text: multiline
        ? `\n${indentationAt(code, first.start!)}plugins={[${plugin.local}]}`
        : ` plugins={[${plugin.local}]}`,
    });
  } else {
    const value =
      attr.type === "JSXAttribute" &&
      attr.value?.type === "JSXExpressionContainer" &&
      attr.value.expression.type !== "JSXEmptyExpression"
        ? attr.value.expression
        : null;
    const list = value && pluginArray(ast, value);
    if (!list)
      return {
        status: "manual",
        detail: "plugins isn't an array literal or a constant holding one",
      };
    const singleLine = lineOf(code, list.start!) === lineOf(code, list.end!);
    const items = list.elements.filter(Boolean) as Node[];
    edits.push(
      singleLine
        ? items.length
          ? { at: items[items.length - 1].end!, text: `, ${plugin.local}` }
          : { at: list.start! + 1, text: plugin.local }
        : appendAfterLast(code, list, items, () => plugin.local)
    );
  }

  const q = quoteOf(code);
  const imports = ast.program.body.filter(
    (s) => s.type === "ImportDeclaration"
  );
  const last = imports[imports.length - 1];
  const semi = !last || code[last.end! - 1] === ";" ? ";" : "";
  const lines = [
    `import { ${plugin.factory} } from ${q}${plugin.source}${q}${semi}`,
    ...(plugin.css ? [`import ${q}${plugin.css}${q}${semi}`] : []),
  ].join("\n");
  const created = `const ${plugin.local} = ${plugin.factory}()${semi}`;
  edits.push(
    last
      ? { at: last.end!, text: `\n${lines}\n\n${created}` }
      : { at: 0, text: `${lines}\n\n${created}\n\n` }
  );

  let next = code;
  for (const edit of [...edits].sort((a, b) => b.at - a.at))
    next = next.slice(0, edit.at) + edit.text + next.slice(edit.end ?? edit.at);

  return {
    status: "inserted",
    code: next,
    inserted: edits.map(({ at, text }) => ({ at, text })),
  };
};
