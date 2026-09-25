import { parseModule } from "../../src/ast/parse";

const POSITION_KEYS = new Set([
  "start",
  "end",
  "loc",
  "extra",
  "range",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "comments",
  "tokens",
]);

type Json = unknown;

const strip = (node: Json, opts: { dropProperties: string[] }): Json => {
  if (Array.isArray(node)) return node.map((n) => strip(n, opts));
  if (!node || typeof node !== "object") return node;

  const obj = node as Record<string, Json>;

  if (obj.type === "ObjectExpression") {
    const properties = (obj.properties as Record<string, Json>[]).filter(
      (p) => {
        const key = p.key as Record<string, Json> | undefined;
        return !(
          key && opts.dropProperties.includes(String(key.name ?? key.value))
        );
      }
    );
    return { type: "ObjectExpression", properties: strip(properties, opts) };
  }

  if (obj.type === "CallExpression") {
    const args = (obj.arguments as Record<string, Json>[]).map(
      (a) => strip(a, opts) as Record<string, Json>
    );
    const last = args[args.length - 1];
    // `fn(a, {})` is equivalent to `fn(a)` for our handlers
    if (
      last?.type === "ObjectExpression" &&
      (last.properties as Json[]).length === 0
    )
      args.pop();
    return {
      type: "CallExpression",
      callee: strip(obj.callee, opts),
      arguments: args,
    };
  }

  const out: Record<string, Json> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (POSITION_KEYS.has(key)) continue;
    out[key] = strip(value, opts);
  }
  return out;
};

/** A comparable form of a module, ignoring formatting, comments and chosen properties */
export const normalizeModule = (
  code: string,
  filename: string,
  opts: { dropProperties?: string[] } = {}
) =>
  JSON.stringify(
    strip(parseModule(code, filename).program, {
      dropProperties: opts.dropProperties ?? [],
    })
  );
