import { withAllowedBuilds } from "../pnpm-builds";

describe("withAllowedBuilds", () => {
  it("creates a file with allowBuilds", () => {
    expect(withAllowedBuilds(null, ["esbuild"])).toMatchInlineSnapshot(`
      "# Dependencies allowed to run install scripts (required by pnpm 11+)

      allowBuilds:
        esbuild: true
      "
    `);
  });

  it("adds missing entries to allowBuilds, keeping comments", () => {
    const text = [
      "packages:",
      '  - "apps/*"',
      "",
      "# Supply-chain policy",
      "allowBuilds:",
      "  sharp: true # images",
      "",
    ].join("\n");

    expect(withAllowedBuilds(text, ["esbuild"])).toBe(
      [
        "packages:",
        '  - "apps/*"',
        "",
        "# Supply-chain policy",
        "allowBuilds:",
        "  sharp: true # images",
        "  esbuild: true",
        "",
      ].join("\n")
    );
  });

  it("adds allowBuilds to a workspace without one", () => {
    expect(withAllowedBuilds("packages:\n  - apps/*\n", ["esbuild"])).toBe(
      "packages:\n  - apps/*\nallowBuilds:\n  esbuild: true\n"
    );
  });

  it("respects an existing decision", () => {
    expect(
      withAllowedBuilds("allowBuilds:\n  esbuild: false\n", ["esbuild"])
    ).toBeNull();
    expect(
      withAllowedBuilds("neverBuiltDependencies:\n  - esbuild\n", ["esbuild"])
    ).toBeNull();
  });

  it("appends to a legacy onlyBuiltDependencies list", () => {
    expect(
      withAllowedBuilds("onlyBuiltDependencies:\n  - sharp\n", ["esbuild"])
    ).toBe("onlyBuiltDependencies:\n  - sharp\n  - esbuild\n");
  });

  it("does nothing when all builds are allowed", () => {
    expect(
      withAllowedBuilds("dangerouslyAllowAllBuilds: true\n", ["esbuild"])
    ).toBeNull();
  });

  it("leaves a file it can't parse alone", () => {
    expect(withAllowedBuilds("packages: [\n", ["esbuild"])).toBeNull();
  });
});
