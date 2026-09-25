import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { REPO_ROOT, tmpDir } from "./helpers/harness";

// Exports the real docs site, so new MDX components that don't convert to
// markdown fail here instead of leaking into `puck docs` and llms.txt
const pagesDir = path.join(REPO_ROOT, "apps", "docs", "pages", "docs");
const outDir = path.join(tmpDir(), "docs");

execFileSync(
  process.execPath,
  [path.join(__dirname, "..", "scripts", "copy-docs.mjs"), "--out", outDir],
  { stdio: "pipe" }
);

const walk = (dir: string, ext: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });

const relative = (dir: string, ext: string) =>
  walk(dir, ext)
    .map((file) => path.relative(dir, file).slice(0, -ext.length))
    .sort();

const index: { path: string; title: string }[] = JSON.parse(
  fs.readFileSync(path.join(outDir, "index.json"), "utf8")
);

const pages = index.map((page) => ({
  ...page,
  content: fs.readFileSync(path.join(outDir, `${page.path}.md`), "utf8"),
}));

const withoutCode = (markdown: string) =>
  markdown
    .replace(/^([ \t]*)(`{3,}|~{3,})[\s\S]*?^\1\2/gm, "")
    .replace(/`[^`\n]*`/g, "");

describe("docs export", () => {
  it("exports every page once", () => {
    const expected = relative(pagesDir, ".mdx");
    expect(relative(outDir, ".md")).toEqual(expected);
    expect(index.map((page) => page.path).sort()).toEqual(expected);
  });

  it("keeps the sidebar order", () => {
    expect(index.slice(0, 3).map((page) => page.path)).toEqual([
      "index",
      "getting-started",
      "cli",
    ]);
  });

  it("gives every page a title", () => {
    for (const page of index) expect(page.title).toBeTruthy();
  });

  it.each(pages.map((page) => [page.path, page]))(
    "%s is plain markdown",
    (_, page) => {
      const prose = withoutCode(page.content);
      expect(prose).not.toMatch(/^import /m);
      expect(prose).not.toMatch(/^export /m);
      expect(prose).not.toMatch(/<[A-Z][\w.]*[\s/>]/);
      expect(page.content).not.toMatch(/^[ \t]*```\S*[ \t]+\S/m);
    }
  );

  it("keeps the content of inline components", () => {
    const page = pages.find(
      (p) => p.path === "api-reference/theming/computed-values"
    );
    expect(page?.content).toContain("| #181818 |");
  });

  it("turns callouts into blockquotes", () => {
    const page = pages.find((p) => p.path === "extending-puck/ui-overrides");
    expect(page?.content).toContain(
      "> **Note:** The overrides API is highly experimental"
    );
  });

  it("resolves relative links", () => {
    const page = pages.find((p) => p.path === "api-reference/fields/text");
    expect(page?.content).toContain("[Base](/docs/api-reference/fields/base)");
  });
});
