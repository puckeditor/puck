import { getNestedDiff } from "../get-nested-diff";

describe("get-nested-diff", () => {
  it("returns an empty object when both objects are equal", () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    expect(getNestedDiff(obj1, obj2)).toEqual({});
  });

  it("returns the correct diff for nested objects", () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 3 } };
    expect(getNestedDiff(obj1, obj2)).toEqual({
      a: false,
      b: true,
      "b.c": true,
    });
  });

  it("returns the correct diff for arrays", () => {
    const obj1 = { a: [1, 2, 3] };
    const obj2 = { a: [1, 2, 4] };
    expect(getNestedDiff(obj1, obj2)).toEqual({
      a: true,
      "a.[0]": false,
      "a.[1]": false,
      "a.[2]": true,
    });
  });

  it("returns the correct diff for mixed types", () => {
    const obj1 = { a: 1, b: [1, 2], c: { d: 3 } };
    const obj2 = { a: 2, b: [1, 3], c: { d: 4 } };
    expect(getNestedDiff(obj1, obj2)).toEqual({
      a: true,
      b: true,
      "b.[0]": false,
      "b.[1]": true,
      c: true,
      "c.d": true,
    });
  });
});
