import { getCollisionPosition, getInsertIndex } from "../get-insert-index";

describe("get-insert-index", () => {
  describe("getCollisionPosition", () => {
    it("maps vertical directions independently of text direction", () => {
      expect(getCollisionPosition("up")).toBe("before");
      expect(getCollisionPosition("down")).toBe("after");
      expect(getCollisionPosition("up", "rtl")).toBe("before");
      expect(getCollisionPosition("down", "rtl")).toBe("after");
    });

    it("maps horizontal directions according to text direction", () => {
      expect(getCollisionPosition("left", "ltr")).toBe("before");
      expect(getCollisionPosition("right", "ltr")).toBe("after");
      expect(getCollisionPosition("left", "rtl")).toBe("after");
      expect(getCollisionPosition("right", "rtl")).toBe("before");
    });

    it("defaults to after when there is no direction", () => {
      expect(getCollisionPosition(null)).toBe("after");
      expect(getCollisionPosition(undefined)).toBe("after");
    });
  });

  describe("getInsertIndex", () => {
    it("inserts before/after the target for cross-zone moves", () => {
      expect(
        getInsertIndex({
          position: "before",
          sourceIndex: 0,
          targetIndex: 3,
          isSameZone: false,
        })
      ).toBe(3);

      expect(
        getInsertIndex({
          position: "after",
          sourceIndex: 0,
          targetIndex: 3,
          isSameZone: false,
        })
      ).toBe(4);
    });

    it("compensates for the removed item when moving down within a zone", () => {
      expect(
        getInsertIndex({
          position: "before",
          sourceIndex: 1,
          targetIndex: 3,
          isSameZone: true,
        })
      ).toBe(2);

      expect(
        getInsertIndex({
          position: "after",
          sourceIndex: 1,
          targetIndex: 3,
          isSameZone: true,
        })
      ).toBe(3);
    });

    it("does not compensate when moving up within a zone", () => {
      expect(
        getInsertIndex({
          position: "before",
          sourceIndex: 3,
          targetIndex: 1,
          isSameZone: true,
        })
      ).toBe(1);

      expect(
        getInsertIndex({
          position: "after",
          sourceIndex: 3,
          targetIndex: 1,
          isSameZone: true,
        })
      ).toBe(2);
    });

    it("returns the source index when dropping back beside itself", () => {
      // Hovering the upper half of the next sibling, or the lower half of
      // the previous one, resolves to the item's current position.
      expect(
        getInsertIndex({
          position: "before",
          sourceIndex: 2,
          targetIndex: 3,
          isSameZone: true,
        })
      ).toBe(2);

      expect(
        getInsertIndex({
          position: "after",
          sourceIndex: 2,
          targetIndex: 1,
          isSameZone: true,
        })
      ).toBe(2);
    });
  });
});
