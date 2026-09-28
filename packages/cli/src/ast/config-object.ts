import type { File, Node, ObjectExpression } from "@babel/types";
import { tryParseModule, unwrapExpression } from "./parse";
import { indentationAt, lineOf } from "./splice";

export type Analysis =
  | { ok: true; ast: File; config: ObjectExpression }
  | { ok: false; detail: string };

export const keyName = (node: Node) => {
  if (node.type !== "ObjectProperty" || node.computed) return null;
  if (node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "StringLiteral") return node.key.value;
  return null;
};

export const findProperty = (obj: ObjectExpression, key: string) =>
  obj.properties.find((p) => keyName(p) === key) as
    | (Node & { type: "ObjectProperty" })
    | undefined;

/** The object literal a config module exports by default */
export const analyzeConfig = (code: string, filename: string): Analysis => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { ok: false, detail: `Could not parse ${filename}` };

  const exportDefault = ast.program.body.find(
    (s) => s.type === "ExportDefaultDeclaration"
  );
  if (!exportDefault || exportDefault.type !== "ExportDefaultDeclaration") {
    return { ok: false, detail: "No default export" };
  }

  let exported = unwrapExpression(exportDefault.declaration as Node);
  // e.g. `const config = defineConfig({...}); export default config`
  if (exported.type === "Identifier") {
    const name = exported.name;
    for (const statement of ast.program.body) {
      if (
        statement.type !== "VariableDeclaration" ||
        statement.kind !== "const"
      )
        continue;
      const declarator = statement.declarations.find(
        (d) => d.id.type === "Identifier" && d.id.name === name
      );
      if (declarator?.init) exported = unwrapExpression(declarator.init);
    }
  }
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

/** Where and how a new last entry goes, matching the list's layout */
export const appendAfterLast = (
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

export const insertProperty = (
  code: string,
  obj: ObjectExpression,
  property: (indent: string, singleLine: boolean) => string
) => appendAfterLast(code, obj, obj.properties as Node[], property);

export type ConfigEditResult =
  | { status: "exists" }
  | {
      status: "inserted";
      code: string;
      inserted: { at: number; text: string }[];
    }
  | { status: "manual"; detail: string };

/** The file's string quote, so inserted code matches it */
export const quoteOf = (code: string) =>
  /^\s*import[^'"\n]*'/m.test(code) ? "'" : '"';

const semicolonsIn = (ast: File, code: string) => {
  const last = ast.program.body.filter((s) => s.type === "ImportDeclaration");
  const node = last[last.length - 1] ?? ast.program.body[0];
  return node ? code[node.end! - 1] === ";" : true;
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Makes sure a nested string entry exists in the exported config, e.g.
 * `server.proxy["/api"]`, creating the objects on the way. Existing entries
 * are never overwritten.
 */
export const ensureConfigEntry = (
  code: string,
  filename: string,
  objectPath: string[],
  key: string,
  value: string
): ConfigEditResult => {
  const analysis = analyzeConfig(code, filename);
  if (!analysis.ok) return { status: "manual", detail: analysis.detail };

  const q = quoteOf(code);
  const quote = (s: string) =>
    `${q}${s.replace(/\\/g, "\\\\").replace(new RegExp(q, "g"), `\\${q}`)}${q}`;
  const keyText = IDENTIFIER.test(key) ? key : quote(key);
  const entry = `${keyText}: ${quote(value)}`;

  let obj = analysis.config;
  for (let i = 0; i <= objectPath.length; i++) {
    const segment = objectPath[i];
    const existing =
      segment === undefined
        ? findProperty(obj, key)
        : findProperty(obj, segment);
    if (existing && segment === undefined) return { status: "exists" };

    if (!existing) {
      if (obj.properties.some((p) => p.type === "SpreadElement")) {
        return {
          status: "manual",
          detail: `The config spreads another object that may set ${[
            ...objectPath.slice(0, i),
            segment ?? key,
          ].join(".")}`,
        };
      }
      const rest = objectPath.slice(i);
      const multiLine = (indent: string) =>
        rest.reduceRight((inner, s, depth) => {
          const pad = `${indent}${"  ".repeat(depth)}`;
          return `${s}: {\n${pad}  ${inner},\n${pad}}`;
        }, entry);
      // An empty `{}` is expanded rather than filled on one line
      const edit =
        obj.properties.length === 0
          ? (() => {
              const indent = indentationAt(code, obj.start!);
              return {
                at: obj.start! + 1,
                text: `\n${indent}  ${multiLine(`${indent}  `)},\n${indent}`,
              };
            })()
          : insertProperty(code, obj, (indent, singleLine) =>
              singleLine
                ? rest.reduceRight((inner, s) => `${s}: { ${inner} }`, entry)
                : multiLine(indent)
            );
      const next = code.slice(0, edit.at) + edit.text + code.slice(edit.at);
      return { status: "inserted", code: next, inserted: [edit] };
    }

    const value = unwrapExpression(existing.value);
    if (value.type !== "ObjectExpression") {
      return {
        status: "manual",
        detail: `${objectPath
          .slice(0, i + 1)
          .join(".")} is not an object literal`,
      };
    }
    obj = value;
  }
  return { status: "exists" };
};

/**
 * Adds `call` to the exported config's plugins, importing `importName` from
 * `source`. A single-line array is reflowed to one plugin per line when the
 * call wouldn't fit in 80 columns, like Prettier.
 */
export const ensurePlugin = (
  code: string,
  filename: string,
  {
    importName,
    source,
    call: callFor,
  }: {
    importName: string;
    source: string;
    /** The plugin call, given the file's quote */
    call: string | ((quote: string) => string);
  }
): ConfigEditResult => {
  const analysis = analyzeConfig(code, filename);
  if (!analysis.ok) return { status: "manual", detail: analysis.detail };
  const { ast, config } = analysis;
  const q = quoteOf(code);
  const semi = semicolonsIn(ast, code) ? ";" : "";
  const call = typeof callFor === "string" ? callFor : callFor(q);

  const imported = ast.program.body.some(
    (s) =>
      s.type === "ImportDeclaration" &&
      s.source.value === source &&
      s.specifiers.some((sp) => sp.local.name === importName)
  );

  const edits: { at: number; end?: number; text: string }[] = [];
  const plugins = findProperty(config, "plugins");
  if (!plugins) {
    if (config.properties.some((p) => p.type === "SpreadElement"))
      return {
        status: "manual",
        detail: "The config spreads another object that may set plugins",
      };
    edits.push(insertProperty(code, config, () => `plugins: [${call}]`));
  } else {
    const list = unwrapExpression(plugins.value);
    if (list.type !== "ArrayExpression")
      return { status: "manual", detail: "plugins is not an array literal" };
    const exists = list.elements.some((e) => {
      const el = e && unwrapExpression(e);
      return (
        el?.type === "CallExpression" &&
        el.callee.type === "Identifier" &&
        el.callee.name === importName
      );
    });
    if (exists) return { status: "exists" };

    const singleLine = lineOf(code, list.start!) === lineOf(code, list.end!);
    const items = list.elements.map((e) => code.slice(e!.start!, e!.end!));
    const lineStart = code.lastIndexOf("\n", list.start! - 1) + 1;
    const lineEnd = code.indexOf("\n", list.end!);
    const oneLine = `[${[...items, call].join(", ")}]`;
    const width =
      list.start! -
      lineStart +
      oneLine.length +
      (lineEnd === -1 ? code.length : lineEnd) -
      list.end!;

    if (singleLine && width <= 80) {
      edits.push({ at: list.start!, end: list.end!, text: oneLine });
    } else if (singleLine) {
      const indent = indentationAt(code, list.start!);
      edits.push({
        at: list.start!,
        end: list.end!,
        text: `[\n${[...items, call]
          .map((item) => `${indent}  ${item},`)
          .join("\n")}\n${indent}]`,
      });
    } else {
      edits.push(
        appendAfterLast(code, list, list.elements as Node[], () => call)
      );
    }
  }

  if (!imported) {
    const line = `import ${importName} from ${q}${source}${q}${semi}`;
    const imports = ast.program.body.filter(
      (s) => s.type === "ImportDeclaration"
    );
    const last = imports[imports.length - 1];
    edits.push(
      last ? { at: last.end!, text: `\n${line}` } : { at: 0, text: `${line}\n` }
    );
  }

  let next = code;
  for (const edit of [...edits].sort((a, b) => b.at - a.at))
    next = next.slice(0, edit.at) + edit.text + next.slice(edit.end ?? edit.at);

  return {
    status: "inserted",
    code: next,
    inserted: edits.map(({ at, text }) => ({ at, text })),
  };
};
