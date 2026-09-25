import { parse } from "@babel/parser";
import type { File, Node } from "@babel/types";

const isTsx = (filename: string) => /\.(tsx|jsx|js|mjs|cjs)$/.test(filename);

export const parseModule = (code: string, filename: string): File =>
  parse(code, {
    sourceType: "module",
    // JSX can't be enabled for .ts files, where `<T>x` is a type assertion
    plugins: isTsx(filename) ? ["typescript", "jsx"] : ["typescript"],
    errorRecovery: false,
  });

export const tryParseModule = (code: string, filename: string): File | null => {
  try {
    return parseModule(code, filename);
  } catch {
    return null;
  }
};

const SKIP_KEYS = new Set([
  "loc",
  "start",
  "end",
  "extra",
  "leadingComments",
  "trailingComments",
  "innerComments",
]);

/** Depth-first walk over every AST node */
export const walk = (
  node: Node,
  visit: (node: Node, parent: Node | null) => void
) => {
  const visitNode = (current: Node, parent: Node | null) => {
    visit(current, parent);
    for (const key of Object.keys(current)) {
      if (SKIP_KEYS.has(key)) continue;
      const value = (current as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) {
          if (
            child &&
            typeof child === "object" &&
            typeof (child as Node).type === "string"
          ) {
            visitNode(child as Node, current);
          }
        }
      } else if (
        value &&
        typeof value === "object" &&
        typeof (value as Node).type === "string"
      ) {
        visitNode(value as Node, current);
      }
    }
  };

  visitNode(node, null);
};

/** Strips `satisfies`, `as`, `!` and parentheses from an expression */
export const unwrapExpression = (node: Node): Node => {
  let current: Node = node;
  for (;;) {
    if (
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSAsExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "ParenthesizedExpression"
    ) {
      current = current.expression;
    } else {
      return current;
    }
  }
};
