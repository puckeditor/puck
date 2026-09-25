import fs from "node:fs";
import path from "node:path";
import { Vfs } from "../../io/vfs";
import { isIgnored, planIgnore } from "../gitignore";
import { tmpDir, writeTree } from "../../../__tests__/helpers/harness";

const check = (gitignore: string, file = ".env.local") => {
  const root = tmpDir();
  writeTree(root, { ".gitignore": gitignore });
  return isIgnored(new Vfs(), path.join(root, file), root);
};

describe("isIgnored", () => {
  it.each([
    [".env.local", true],
    [".env*", true],
    [".env*.local", true],
    ["*.local", true],
    ["/.env.local", true],
    [".env", false],
    [".env*\n!.env.local", false],
    ["node_modules\n", false],
  ])("%j → %s", (pattern, expected) => {
    expect(check(pattern)).toBe(expected);
  });

  it("applies parent .gitignore files to nested apps", () => {
    const root = tmpDir();
    writeTree(root, {
      ".gitignore": ".env*.local\n",
      "apps/web/.gitignore": "/.next/\n",
    });
    expect(
      isIgnored(new Vfs(), path.join(root, "apps/web/.env.local"), root)
    ).toBe(true);
  });

  it("anchors patterns with slashes to their .gitignore", () => {
    const root = tmpDir();
    writeTree(root, { ".gitignore": "apps/web/.env.local\n" });
    expect(
      isIgnored(new Vfs(), path.join(root, "apps/web/.env.local"), root)
    ).toBe(true);
    expect(
      isIgnored(new Vfs(), path.join(root, "apps/admin/.env.local"), root)
    ).toBe(false);
  });
});

describe("planIgnore", () => {
  it("appends to the app's .gitignore with a relative pattern", () => {
    const root = tmpDir();
    writeTree(root, { ".gitignore": "node_modules" });
    const plan = planIgnore(
      new Vfs(),
      path.join(root, ".env.local"),
      root,
      null
    );
    expect(plan.content).toBe(
      "node_modules\n\n# Puck Cloud API key\n.env.local\n"
    );
  });

  it("falls back to the git root .gitignore", () => {
    const root = tmpDir();
    writeTree(root, {
      ".gitignore": "node_modules\n",
      "apps/web/package.json": "{}",
    });
    fs.mkdirSync(path.join(root, ".git"));
    const plan = planIgnore(
      new Vfs(),
      path.join(root, "apps/web/.env.local"),
      path.join(root, "apps/web"),
      root
    );
    expect(plan.gitignore).toBe(path.join(root, ".gitignore"));
    expect(plan.content).toContain("apps/web/.env.local\n");
  });
});
