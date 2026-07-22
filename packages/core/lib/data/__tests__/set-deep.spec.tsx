import { setDeep } from "../set-deep";

describe("setDeep", () => {
  describe("assignment", () => {
    it("sets a top-level prop", () => {
      expect(setDeep({ a: 1 }, "b", 2)).toEqual({ a: 1, b: 2 });
    });

    it("sets a nested object prop", () => {
      expect(setDeep({ a: { b: 1, c: 3 } }, "a.b", 2)).toEqual({
        a: { b: 2, c: 3 },
      });
    });

    it("sets an array item", () => {
      expect(setDeep({ arr: [1, 2] }, "arr[1]", 9)).toEqual({ arr: [1, 9] });
    });

    it("sets a nested prop inside an array item", () => {
      expect(setDeep({ arr: [{ x: 1 }, { x: 2 }] }, "arr[0].x", 9)).toEqual({
        arr: [{ x: 9 }, { x: 2 }],
      });
    });

    it("sets a deeply nested mixed path", () => {
      expect(
        setDeep(
          { a: { b: [{ c: { d: 1 } }, { c: { d: 2 } }] } },
          "a.b[1].c.d",
          9
        )
      ).toEqual({ a: { b: [{ c: { d: 1 } }, { c: { d: 9 } }] } });
    });

    it("creates missing objects along the path", () => {
      expect(setDeep({}, "a.b.c", 1)).toEqual({ a: { b: { c: 1 } } });
    });

    it("creates missing arrays along the path", () => {
      expect(setDeep({}, "a[0].b", 1)).toEqual({ a: [{ b: 1 }] });
    });

    it("replaces non-array values with an array when using index syntax", () => {
      expect(setDeep({ a: "string" }, "a[0]", 1)).toEqual({ a: [1] });
    });

    it("replaces non-object intermediate values with an object", () => {
      const original = { a: 5 };

      expect(setDeep(original, "a.b", 1)).toEqual({ a: { b: 1 } });
      expect(original).toEqual({ a: 5 });
    });
  });

  describe("immutability", () => {
    it("does not mutate nested objects on the input", () => {
      const original = { composite: { focal: "original" }, other: "unchanged" };

      const result = setDeep(original, "composite.focal", "A-value");

      expect(result.composite.focal).toBe("A-value");
      expect(original.composite.focal).toBe("original");
    });

    it("does not mutate arrays on the input", () => {
      const original = { items: [{ label: "one" }, { label: "two" }] };

      const result = setDeep(original, "items[0].label", "changed");

      expect(result.items[0].label).toBe("changed");
      expect(original.items[0].label).toBe("one");
    });

    it("does not mutate the input when assigning to a leaf array index", () => {
      const original = { arr: [1, 2] };

      const result = setDeep(original, "arr[1]", 9);

      expect(result.arr).toEqual([1, 9]);
      expect(original.arr).toEqual([1, 2]);
      expect(result.arr).not.toBe(original.arr);
    });

    it("does not mutate deeply nested structure on the input", () => {
      const original = { a: { b: [{ c: { d: "original" } }] } };

      const result = setDeep(original, "a.b[0].c.d", "changed");

      expect(result.a.b[0].c.d).toBe("changed");
      expect(original.a.b[0].c.d).toBe("original");
    });

    it("returns a new object at every level of the assignment path", () => {
      const original = { a: { b: [{ c: 1 }] } };

      const result = setDeep(original, "a.b[0].c", 2);

      expect(result).not.toBe(original);
      expect(result.a).not.toBe(original.a);
      expect(result.a.b).not.toBe(original.a.b);
      expect(result.a.b[0]).not.toBe(original.a.b[0]);
    });

    it("preserves references for values outside the assignment path", () => {
      const original = {
        target: { value: 1 },
        sibling: { value: 2 },
        items: [{ label: "one" }, { label: "two" }],
      };

      const result = setDeep(original, "items[0].label", "changed");

      expect(result.target).toBe(original.target);
      expect(result.sibling).toBe(original.sibling);
      expect(result.items[1]).toBe(original.items[1]);
    });
  });
});
