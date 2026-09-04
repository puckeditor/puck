import { sourceHash, stableStringify } from "../source-hash";

describe("stableStringify", () => {
  it("is insensitive to key order", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it("sorts nested keys too", () => {
    expect(stableStringify({ o: { a: 1, b: 2 } })).toBe(
      stableStringify({ o: { b: 2, a: 1 } })
    );
  });

  it("preserves array order", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it("handles null and undefined without throwing", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(undefined)).toBe("null");
    expect(stableStringify({ a: undefined })).toBe('{"a":null}');
  });
});

describe("sourceHash", () => {
  it("is stable across calls", () => {
    const data = { content: [{ type: "Heading" }], root: { props: {} } };

    expect(sourceHash(data)).toBe(sourceHash(data));
  });

  it("ignores key order", () => {
    expect(sourceHash({ content: [], root: {} })).toBe(
      sourceHash({ root: {}, content: [] })
    );
  });

  it("changes when content changes", () => {
    expect(sourceHash({ title: "Pricing" })).not.toBe(
      sourceHash({ title: "Pricing!" })
    );
  });

  it("returns a compact string", () => {
    expect(sourceHash({ a: 1 })).toMatch(/^[0-9a-z]+$/);
  });
});
