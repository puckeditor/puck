/**
 * Deterministic stringify: object keys are sorted so that two structurally
 * equal pages hash the same regardless of how they were authored. Array order
 * is significant and preserved.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    // `undefined`, functions and symbols stringify to `undefined`.
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

/**
 * cyrb53 — a fast, well-distributed non-cryptographic hash. Drift detection is
 * a correctness aid, not a security boundary, so there is no reason to pull in
 * `node:crypto` and make this entry Node-only.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Stable hash of any JSON-serialisable value. */
export function sourceHash(value: unknown): string {
  return cyrb53(stableStringify(value)).toString(36);
}
