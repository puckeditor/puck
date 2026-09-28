import type { File, Node, Statement } from "@babel/types";
import { tryParseModule, unwrapExpression, walk } from "./parse";
import { applyEdits, TextEdit } from "./splice";

export type ServerKind = "hono" | "express";

export interface Mount {
  /** The exported router, e.g. puckPages, or any export when undefined */
  name?: string;
  /** Import source relative to the entry, e.g. ./puck/pages.js */
  source: string;
}

export type MountResult =
  | { status: "exists" }
  | {
      status: "inserted";
      code: string;
      inserted: { at: number; text: string }[];
    }
  | { status: "manual"; detail: string };

const stripExtension = (source: string) => source.replace(/\.(m?[jt]sx?)$/, "");

/** The root of a call chain, e.g. `new Hono()` in `new Hono().basePath("/")` */
const chainRoot = (node: Node): { root: Node; methods: string[] } => {
  const methods: string[] = [];
  let current = unwrapExpression(node);
  while (
    current.type === "CallExpression" &&
    current.callee.type === "MemberExpression" &&
    current.callee.property.type === "Identifier"
  ) {
    methods.unshift(current.callee.property.name);
    current = unwrapExpression(current.callee.object);
  }
  return { root: current, methods };
};

/** Local name of `import express from "express"` */
const expressName = (ast: File) => {
  for (const s of ast.program.body) {
    if (s.type !== "ImportDeclaration" || s.source.value !== "express")
      continue;
    const def = s.specifiers.find((sp) => sp.type === "ImportDefaultSpecifier");
    if (def) return def.local.name;
  }
  return null;
};

const isAppCreation = (
  init: Node,
  kind: ServerKind,
  express: string | null
) => {
  const { root } = chainRoot(init);
  if (kind === "hono") {
    return (
      root.type === "NewExpression" &&
      root.callee.type === "Identifier" &&
      root.callee.name === "Hono"
    );
  }
  return (
    root.type === "CallExpression" &&
    root.callee.type === "Identifier" &&
    root.callee.name === express
  );
};

/** The top-level `const app = new Hono()` or `const app = express()` */
const findApp = (ast: File, kind: ServerKind) => {
  const express = expressName(ast);
  const body = ast.program.body;
  for (let index = 0; index < body.length; index++) {
    const statement = body[index];
    const decl =
      statement.type === "ExportNamedDeclaration"
        ? statement.declaration
        : statement;
    if (decl?.type !== "VariableDeclaration") continue;
    for (const d of decl.declarations) {
      if (d.id.type !== "Identifier" || !d.init) continue;
      if (isAppCreation(d.init, kind, express)) {
        return {
          name: d.id.name,
          index,
          methods: chainRoot(d.init).methods,
        };
      }
    }
  }
  return null;
};

/** Local names imported from `source` (compared without extensions) */
const importedNames = (ast: File, source: string) => {
  const target = stripExtension(source);
  const names = new Map<string, string>();
  for (const s of ast.program.body) {
    if (s.type !== "ImportDeclaration") continue;
    if (stripExtension(s.source.value) !== target) continue;
    for (const sp of s.specifiers) {
      if (sp.type === "ImportSpecifier" && sp.imported.type === "Identifier")
        names.set(sp.imported.name, sp.local.name);
    }
  }
  return names;
};

/** `app.route(path, name)` or `app.use([path,] name)` */
const isMountCall = (node: Node, app: string, local: string) =>
  node.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  node.callee.object.type === "Identifier" &&
  node.callee.object.name === app &&
  node.callee.property.type === "Identifier" &&
  ["route", "use"].includes(node.callee.property.name) &&
  node.arguments.some((a) => a.type === "Identifier" && a.name === local);

const mountedIn = (ast: File, app: string, local: string | undefined) => {
  if (!local) return false;
  let found = false;
  walk(ast.program, (n) => {
    if (!found && isMountCall(n, app, local)) found = true;
  });
  return found;
};

/** Whether the entry mounts `mount.name` imported from `mount.source` */
export const isMounted = (
  code: string,
  filename: string,
  kind: ServerKind,
  mount: Mount
) => {
  const ast = tryParseModule(code, filename);
  if (!ast) return false;
  const app = findApp(ast, kind);
  if (!app) return false;
  const names = importedNames(ast, mount.source);
  const locals = mount.name ? [names.get(mount.name)] : [...names.values()];
  return locals.some((local) => mountedIn(ast, app.name, local));
};

const referencesApp = (statement: Statement, app: string) => {
  let found = false;
  walk(statement, (n) => {
    if (found) return;
    // app.fetch or app.listen(...)
    if (
      n.type === "MemberExpression" &&
      n.object.type === "Identifier" &&
      n.object.name === app &&
      n.property.type === "Identifier" &&
      ["fetch", "listen"].includes(n.property.name)
    )
      found = true;
  });
  return found;
};

/** The statement that starts serving the app, which routes must come before */
const isServeStatement = (statement: Statement, app: string) => {
  if (statement.type === "ExportDefaultDeclaration") return true;
  if (statement.type === "ExpressionStatement") {
    const expr = unwrapExpression(statement.expression);
    if (
      expr.type === "CallExpression" &&
      expr.callee.type === "Identifier" &&
      expr.callee.name === "serve"
    )
      return true;
  }
  return referencesApp(statement, app);
};

const isAnyMount = (statement: Statement, app: string) =>
  statement.type === "ExpressionStatement" &&
  statement.expression.type === "CallExpression" &&
  statement.expression.callee.type === "MemberExpression" &&
  statement.expression.callee.object.type === "Identifier" &&
  statement.expression.callee.object.name === app &&
  statement.expression.callee.property.type === "Identifier" &&
  ["route", "use"].includes(statement.expression.callee.property.name);

/**
 * Imports `mount.name` into a Hono or Express entry and mounts it on the app,
 * before the app starts serving so the user's middleware runs first. Text is
 * spliced at AST offsets, matching the file's quotes and semicolons.
 */
export const ensureMounted = (
  code: string,
  filename: string,
  kind: ServerKind,
  mount: Mount
): MountResult => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { status: "manual", detail: `Could not parse ${filename}` };

  const app = findApp(ast, kind);
  if (!app) {
    return {
      status: "manual",
      detail:
        kind === "hono"
          ? "No top-level `new Hono()` app was found"
          : "No top-level `express()` app was found",
    };
  }
  if (app.methods.includes("basePath")) {
    return {
      status: "manual",
      detail: "The app sets a basePath, which would move Puck's /api routes",
    };
  }

  const name = mount.name!;
  const imported = importedNames(ast, mount.source).get(name);
  if (mountedIn(ast, app.name, imported)) return { status: "exists" };

  const body = ast.program.body;
  const q = /^\s*import[^'"]*'/m.test(code) ? "'" : '"';
  const imports = body.filter((s) => s.type === "ImportDeclaration");
  const lastImport = imports[imports.length - 1];
  const semi =
    (lastImport ?? body[app.index]) &&
    code[(lastImport ?? body[app.index]).end! - 1] === ";"
      ? ";"
      : "";

  const edits: TextEdit[] = [];
  const inserted: { at: number; text: string }[] = [];
  const insert = (at: number, text: string) => {
    edits.push({ start: at, end: at, text });
    inserted.push({ at, text });
  };

  if (!imported) {
    const line = `import { ${name} } from ${q}${mount.source}${q}${semi}`;
    if (lastImport) insert(lastImport.end!, `\n${line}`);
    else insert(0, `${line}\n\n`);
  }

  const call =
    kind === "hono"
      ? `${app.name}.route(${q}/${q}, ${name})${semi}`
      : `${app.name}.use(${name})${semi}`;

  const rest = body.slice(app.index + 1);
  const anchorIndex = rest.findIndex((s) => isServeStatement(s, app.name));
  if (anchorIndex === -1) {
    insert(code.length, `${code.endsWith("\n") ? "" : "\n"}\n${call}\n`);
  } else {
    const before = rest[anchorIndex - 1];
    if (before && isAnyMount(before, app.name)) {
      // Keep mounts together
      insert(before.end!, `\n${call}`);
    } else {
      const anchor = rest[anchorIndex];
      const start =
        anchor.leadingComments?.[0]?.start ?? anchor.start ?? code.length;
      insert(start, `${call}\n\n`);
    }
  }

  const next = applyEdits(code, edits);
  if (!isMounted(next, filename, kind, mount)) {
    return {
      status: "manual",
      detail: `Could not verify that ${name} is mounted after editing`,
    };
  }
  return { status: "inserted", code: next, inserted };
};
