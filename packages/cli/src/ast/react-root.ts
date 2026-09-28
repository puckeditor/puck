import type { Node } from "@babel/types";
import { tryParseModule, unwrapExpression, walk } from "./parse";
import { indentationAt } from "./splice";
import type { ConfigEditResult } from "./config-object";
import { quoteOf } from "./config-object";

const isCreateRoot = (node: Node) =>
  node.type === "CallExpression" &&
  ((node.callee.type === "Identifier" && node.callee.name === "createRoot") ||
    (node.callee.type === "MemberExpression" &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "createRoot"));

const isStrictMode = (node: Node) =>
  node.type === "JSXElement" &&
  ((node.openingElement.name.type === "JSXIdentifier" &&
    node.openingElement.name.name === "StrictMode") ||
    (node.openingElement.name.type === "JSXMemberExpression" &&
      node.openingElement.name.property.name === "StrictMode"));

/**
 * Wraps the element passed to `createRoot(...).render(...)` in `component`,
 * inside `<StrictMode>` when there is one, and imports it from `source`
 */
export const ensureRootWrapped = (
  code: string,
  filename: string,
  { component, source }: { component: string; source: string }
): ConfigEditResult => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { status: "manual", detail: `Could not parse ${filename}` };

  let rendered: Node | null = null;
  walk(ast.program, (n) => {
    if (
      !rendered &&
      n.type === "CallExpression" &&
      n.callee.type === "MemberExpression" &&
      n.callee.property.type === "Identifier" &&
      n.callee.property.name === "render" &&
      isCreateRoot(unwrapExpression(n.callee.object)) &&
      n.arguments.length >= 1
    )
      rendered = unwrapExpression(n.arguments[0] as Node);
  });
  if (!rendered) {
    return {
      status: "manual",
      detail: "No createRoot(...).render(...) call was found",
    };
  }
  const root = rendered as Node;
  if (root.type !== "JSXElement") {
    return { status: "manual", detail: "The app isn't rendered as JSX" };
  }

  let alreadyWrapped = false;
  walk(root, (n) => {
    if (
      n.type === "JSXOpeningElement" &&
      n.name.type === "JSXIdentifier" &&
      n.name.name === component
    )
      alreadyWrapped = true;
  });
  if (alreadyWrapped) return { status: "exists" };

  let target: Node = root;
  if (isStrictMode(root) && root.type === "JSXElement") {
    const children = root.children.filter(
      (c) => !(c.type === "JSXText" && c.value.trim() === "")
    );
    if (children.length === 1 && children[0].type === "JSXElement")
      target = children[0];
  }

  const text = code.slice(target.start!, target.end!);
  const lineStart = code.lastIndexOf("\n", target.start! - 1) + 1;
  const ownLine = code.slice(lineStart, target.start!).trim() === "";
  const indent = indentationAt(code, target.start!);
  const wrapped = ownLine
    ? `<${component}>\n${indent}  ${text.replace(
        /\n/g,
        "\n  "
      )}\n${indent}</${component}>`
    : `<${component}>${text}</${component}>`;

  const q = quoteOf(code);
  const imports = ast.program.body.filter(
    (s) => s.type === "ImportDeclaration"
  );
  const last = imports[imports.length - 1];
  const semi = last && code[last.end! - 1] === ";" ? ";" : last ? "" : ";";
  const importLine = `import { ${component} } from ${q}${source}${q}${semi}`;

  const next = code.slice(0, target.start!) + wrapped + code.slice(target.end!);
  const withImport = last
    ? next.slice(0, last.end!) + `\n${importLine}` + next.slice(last.end!)
    : `${importLine}\n${next}`;

  return {
    status: "inserted",
    code: withImport,
    inserted: [
      { at: last ? last.end! : 0, text: importLine },
      { at: target.start! + importLine.length + 1, text: `<${component}>` },
    ],
  };
};
