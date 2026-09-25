import type { Node } from "@babel/types";
import { tryParseModule, walk } from "./parse";

export type LiteralLookup =
  | { status: "absent" }
  | { status: "literal"; value: string }
  | { status: "dynamic" }
  | { status: "parse_error" };

/**
 * Finds `key: "value"` anywhere in a config module. Config files wrap their
 * object in many ways (defineConfig, satisfies, functions), so rather than
 * resolving the export we look for the property itself and only trust it when
 * it is a plain string literal.
 */
export const findStringProperty = (
  code: string,
  filename: string,
  key: string
): LiteralLookup => {
  const ast = tryParseModule(code, filename);
  if (!ast) return { status: "parse_error" };

  let result: LiteralLookup = { status: "absent" };

  walk(ast.program, (node: Node) => {
    if (result.status !== "absent") return;
    if (node.type !== "ObjectProperty") return;

    const name =
      node.key.type === "Identifier"
        ? node.key.name
        : node.key.type === "StringLiteral"
        ? node.key.value
        : null;
    if (name !== key || node.computed) return;

    result =
      node.value.type === "StringLiteral"
        ? { status: "literal", value: node.value.value }
        : { status: "dynamic" };
  });

  return result;
};
