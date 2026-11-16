import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { promisify } from "node:util";
import { execFile, execFileSync } from "node:child_process";
import { REPO_ROOT, tmpDir } from "./helpers/harness";

// Exports the real docs site, so new MDX components that don't convert to
// markdown fail here instead of leaking into `puck docs`
const pagesDir = path.join(REPO_ROOT, "apps", "docs", "pages", "docs");
const outDir = path.join(tmpDir(), "docs");
const script = path.join(__dirname, "..", "scripts", "copy-docs.mjs");

execFileSync(process.execPath, [script, "--out", outDir, "--local"], {
  stdio: "pipe",
});

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

describe("platform docs", () => {
  const llms = `# Puck

## Docs

- [Introduction](/docs/index.md)
- [Getting Started](/docs/getting-started.md)

### Puck AI
- [Overview](/docs/ai/overview.md)
- [chat](/docs/api-reference/ai/cloud-client/chat.md)

### Integrating Puck
- [Component Configuration](/docs/integrating-puck/component-configuration.md)

## Blog

- [A post](/blog/a-post.md)
`;

  const served: Record<string, string> = {
    "/llms.txt": llms,
    "/docs/ai/overview.md": "# Overview\n\nSee [tools](./tools).\n",
    "/docs/api-reference/ai/cloud-client/chat.md": `# chat

<Callout type="warning">
  Deprecated.
</Callout>

\`\`\`tsx showLineNumbers copy {1,6-10}
chat(body);
\`\`\`
`,
  };

  const requested: string[] = [];
  let server: http.Server;
  let baseUrl: string;

  const run = (out: string, url = baseUrl) =>
    promisify(execFile)(process.execPath, [script, "--out", out], {
      env: { ...process.env, PUCK_DOCS_URL: url },
    });

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requested.push(req.url!);
      const body = served[req.url!];
      res.writeHead(body ? 200 : 404).end(body ?? "Not found");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it("adds platform-only pages after their llms.txt predecessor", async () => {
    const out = path.join(tmpDir(), "docs");
    await run(out);

    const merged: { path: string; title: string }[] = JSON.parse(
      fs.readFileSync(path.join(out, "index.json"), "utf8")
    );
    const paths = merged.map((page) => page.path);

    expect(paths.slice(0, 4)).toEqual([
      "index",
      "getting-started",
      "ai/overview",
      "api-reference/ai/cloud-client/chat",
    ]);
    expect(paths).toContain("cli");
    expect(merged.length).toBe(index.length + 2);
    expect(merged[3].title).toBe("chat");
  });

  it("keeps local pages and ignores the blog", () => {
    expect(requested).not.toContain("/docs/getting-started.md");
    expect(requested.some((url) => url.startsWith("/blog"))).toBe(false);
  });

  it("converts platform pages to plain markdown", async () => {
    const out = path.join(tmpDir(), "docs");
    await run(out);

    const chat = fs.readFileSync(
      path.join(out, "api-reference/ai/cloud-client/chat.md"),
      "utf8"
    );
    expect(chat).toContain("> **Warning:** Deprecated.");
    expect(chat).toContain("```tsx\nchat(body);");
    expect(fs.readFileSync(path.join(out, "ai/overview.md"), "utf8")).toContain(
      "[tools](/docs/ai/tools)"
    );
  });

  it("fails when a listed page can't be fetched", async () => {
    delete served["/docs/ai/overview.md"];
    await expect(run(path.join(tmpDir(), "docs"))).rejects.toThrow(
      /ai\/overview\.md failed: 404/
    );
  });
});
