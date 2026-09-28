import type {
  ArrayExpression,
  File,
  Node,
  ObjectExpression,
} from "@babel/types";
import { tryParseModule, unwrapExpression, walk } from "./parse";
import { applyEdits, indentationAt, lineOf } from "./splice";

export type OptimizeDepsResult =
  | { status: "exists" }
  | { status: "inserted"; code: string; at: number; text: string }
  | { status: "manual"; detail: string };

type Analysis =
  | { ok: true; ast: File; config: ObjectExpression }
  | { ok: false; detail: string };

const keyName = (node: Node) => {
  if (node.type !== "ObjectProperty" || node.computed) return null;
  if (node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "StringLiteral") return node.key.value;
  return null;
};

const findProperty = (obj: ObjectExpression, key: string) =>
  obj.properties.find((p) => keyName(p) === key) as
    | (Node & { type: "ObjectProperty" })
    | undefined;

const analyze = (code: string, filename: string): Analysis => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { ok: false, detail: `Could not parse ${filename}` };

  const exportDefault = ast.program.body.find(
    (s) => s.type === "ExportDefaultDeclaration"
  );
  if (!exportDefault || exportDefault.type !== "ExportDefaultDeclaration") {
    return { ok: false, detail: "No default export" };
  }

  let exported = unwrapExpression(exportDefault.declaration as Node);
  if (
    exported.type === "CallExpression" &&
    exported.callee.type === "Identifier" &&
    exported.callee.name === "defineConfig" &&
    exported.arguments.length === 1
  ) {
    exported = unwrapExpression(exported.arguments[0] as Node);
  }

  if (exported.type !== "ObjectExpression") {
    return {
      ok: false,
      detail: "The config is not an object literal (e.g. it's a function)",
    };
  }

  return { ok: true, ast, config: exported };
};

type ListPath = [outer: string, inner: string];

/** Every package in the list, "all" for `true`, or null if it can't be read statically */
const readList = (config: ObjectExpression, [outer, inner]: ListPath) => {
  const section = findProperty(config, outer);
  if (!section) return [];
  const value = unwrapExpression(section.value);
  if (value.type !== "ObjectExpression") return null;
  const prop = findProperty(value, inner);
  if (!prop) return [];
  const list = unwrapExpression(prop.value);
  // e.g. `ssr: { external: true }` already covers every package
  if (list.type === "BooleanLiteral" && list.value) return "all" as const;
  if (list.type !== "ArrayExpression") return null;
  if (!list.elements.every((e) => e?.type === "StringLiteral")) return null;
  return list.elements.map((e) => (e as { value: string }).value);
};

/**
 * Makes sure a `outer.inner` package list in a Vite config lists `pkgs`,
 * splicing text at AST-derived offsets so the user's formatting is left
 * untouched.
 */
const ensureConfigList = (
  code: string,
  filename: string,
  listPath: ListPath,
  pkgs: string[]
): OptimizeDepsResult => {
  const [outer, inner] = listPath;
  const name = `${outer}.${inner}`;
  const analysis = analyze(code, filename);
  if (!analysis.ok) return { status: "manual", detail: analysis.detail };

  const { ast, config } = analysis;
  const existing = readList(config, listPath);
  if (existing === "all") return { status: "exists" };
  if (!existing) {
    return {
      status: "manual",
      detail: `${name} is not a list of package names`,
    };
  }

  const missing = pkgs.filter((pkg) => !existing.includes(pkg));
  if (missing.length === 0) return { status: "exists" };

  // Match the quote style of the file
  let q = '"';
  walk(ast.program, (n) => {
    if (n.type === "StringLiteral" && q === '"' && code[n.start!] === "'")
      q = "'";
  });
  const quoted = missing.map((pkg) => `${q}${pkg}${q}`);

  const section = findProperty(config, outer);
  const list = section
    ? findProperty(unwrapExpression(section.value) as ObjectExpression, inner)
    : undefined;

  let edit: { at: number; text: string };

  if (list) {
    edit = appendToArray(
      code,
      unwrapExpression(list.value) as ArrayExpression,
      quoted
    );
  } else if (section) {
    edit = insertProperty(
      code,
      unwrapExpression(section.value) as ObjectExpression,
      () => `${inner}: [${quoted.join(", ")}]`
    );
  } else {
    if (config.properties.some((p) => p.type === "SpreadElement")) {
      return {
        status: "manual",
        detail: `The config spreads another object that may set ${outer}`,
      };
    }
    edit = insertProperty(code, config, (indent, singleLine) =>
      singleLine
        ? `${outer}: { ${inner}: [${quoted.join(", ")}] }`
        : `${outer}: {\n${indent}  ${inner}: [${quoted.join(
            ", "
          )}],\n${indent}}`
    );
  }

  const next = applyEdits(code, [
    { start: edit.at, end: edit.at, text: edit.text },
  ]);

  const verify = analyze(next, filename);
  const after = verify.ok ? readList(verify.config, listPath) : null;
  if (!Array.isArray(after) || !pkgs.every((pkg) => after.includes(pkg))) {
    return {
      status: "manual",
      detail: `Could not verify ${name} after editing`,
    };
  }

  return { status: "inserted", code: next, ...edit };
};

/**
 * Makes sure `optimizeDeps.include` in a Vite config lists `pkgs`.
 *
 * React Router only feeds its routes to Vite's dependency scanner behind a
 * future flag, so without this Vite discovers Puck on the first request and
 * re-bundles every dependency mid-load, leaving the page with two copies of
 * react-router.
 */
export const ensureOptimizeDepsInclude = (
  code: string,
  filename: string,
  pkgs: string[]
) => ensureConfigList(code, filename, ["optimizeDeps", "include"], pkgs);

/**
 * Makes sure `ssr.external` in a Vite config lists `pkgs`, so Node loads them
 * instead of Vite's module runner.
 */
export const ensureSsrExternal = (
  code: string,
  filename: string,
  pkgs: string[]
) => ensureConfigList(code, filename, ["ssr", "external"], pkgs);

/** Where and how a new last entry goes, matching the list's layout */
const appendAfterLast = (
  code: string,
  node: { start?: number | null; end?: number | null },
  items: Node[],
  entry: (indent: string, singleLine: boolean) => string
) => {
  const singleLine = lineOf(code, node.start!) === lineOf(code, node.end!);

  if (items.length === 0) {
    const indent = `${indentationAt(code, node.start!)}  `;
    return {
      at: node.start! + 1,
      text: singleLine
        ? entry(indent, true)
        : `\n${indent}${entry(indent, false)},`,
    };
  }

  const last = items[items.length - 1];
  const indent = indentationAt(code, last.start!);
  const between = code.slice(last.end!, node.end! - 1);
  const commaIndex = between.indexOf(",");
  const hasTrailingComma =
    commaIndex !== -1 && between.slice(0, commaIndex).trim() === "";

  if (singleLine) {
    return { at: last.end!, text: `, ${entry(indent, true)}` };
  }
  if (hasTrailingComma) {
    return {
      at: last.end! + commaIndex + 1,
      text: `\n${indent}${entry(indent, false)},`,
    };
  }
  return { at: last.end!, text: `,\n${indent}${entry(indent, false)}` };
};

const insertProperty = (
  code: string,
  obj: ObjectExpression,
  property: (indent: string, singleLine: boolean) => string
) => appendAfterLast(code, obj, obj.properties as Node[], property);

const appendToArray = (
  code: string,
  array: ArrayExpression,
  quoted: string[]
) =>
  appendAfterLast(code, array, array.elements as Node[], (indent, singleLine) =>
    quoted.join(singleLine ? ", " : `,\n${indent}`)
  );
