import { resolvePuckPath } from "../resolve-puck-path";

describe("resolvePuckPath", () => {
  describe("string input", () => {
    it.each([
      ["/", { isEditorRoute: false, path: "/" }],
      ["/pricing", { isEditorRoute: false, path: "/pricing" }],
      ["/blog/hello", { isEditorRoute: false, path: "/blog/hello" }],
      ["/pricing/edit", { isEditorRoute: true, path: "/pricing" }],
      ["/edit", { isEditorRoute: true, path: "/" }],
      ["/blog/hello/edit", { isEditorRoute: true, path: "/blog/hello" }],
    ])("resolves %s", (input, expected) => {
      expect(resolvePuckPath(input)).toEqual(expected);
    });

    it("defaults an empty path to the root", () => {
      expect(resolvePuckPath()).toEqual({ isEditorRoute: false, path: "/" });
      expect(resolvePuckPath("")).toEqual({ isEditorRoute: false, path: "/" });
    });

    it("accepts paths without a leading slash", () => {
      expect(resolvePuckPath("pricing").path).toBe("/pricing");
    });
  });

  describe("array input (Next.js catch-all params)", () => {
    it.each([
      [[], { isEditorRoute: false, path: "/" }],
      [["pricing"], { isEditorRoute: false, path: "/pricing" }],
      [["blog", "hello"], { isEditorRoute: false, path: "/blog/hello" }],
      [["pricing", "edit"], { isEditorRoute: true, path: "/pricing" }],
    ])("resolves %j", (input, expected) => {
      expect(resolvePuckPath(input)).toEqual(expected);
    });
  });

  describe("normalisation", () => {
    it("agrees on one key for trailing-slash variants", () => {
      const canonical = resolvePuckPath("/pricing").path;

      expect(resolvePuckPath("/pricing/").path).toBe(canonical);
      expect(resolvePuckPath("/pricing//").path).toBe(canonical);
      expect(resolvePuckPath("/pricing/edit").path).toBe(canonical);
    });

    it("strips query strings and hashes", () => {
      expect(resolvePuckPath("/pricing?a=1").path).toBe("/pricing");
      expect(resolvePuckPath("/pricing#top").path).toBe("/pricing");
    });

    it("decodes percent-encoded segments so they match authored paths", () => {
      expect(resolvePuckPath("/%C3%BCber").path).toBe("/über");
    });

    it("does not throw on a malformed escape sequence", () => {
      expect(resolvePuckPath("/100%").path).toBe("/100%");
    });

    it("resolves traversal away rather than into a store key", () => {
      expect(resolvePuckPath("/blog/../../secret").path).toBe("/secret");
      expect(resolvePuckPath(["blog", "..", "..", "secret"]).path).toBe(
        "/secret"
      );
    });
  });
});
