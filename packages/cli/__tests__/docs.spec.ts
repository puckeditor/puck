import { run, tmpProject, treeSnapshot } from "./helpers/harness";
import { normalizeDocPath } from "../src/commands/docs";

const cwd = () => tmpProject("empty");

describe("docs ls", () => {
  it("lists every page in order", async () => {
    const { json, code } = await run(["docs", "ls", "--json"], { cwd: cwd() });
    expect(code).toBe(0);
    expect(json.docs?.pages?.map((p) => p.path)).toEqual([
      "index",
      "getting-started",
      "api-reference/components/puck",
      "api-reference/fields/text",
      "api-reference/fields/textarea",
      "api-reference/overrides/puck",
    ]);
  });

  it("lists pages when run without a subcommand", async () => {
    const { json } = await run(["docs", "--json"], { cwd: cwd() });
    expect(json.docs?.pages).toHaveLength(6);
  });

  it("filters by section", async () => {
    const { json } = await run(
      ["docs", "ls", "api-reference/fields", "--json"],
      {
        cwd: cwd(),
      }
    );
    expect(json.docs?.pages).toEqual([
      { path: "api-reference/fields/text", title: "Text" },
      { path: "api-reference/fields/textarea", title: "Textarea" },
    ]);
  });

  it("prints paths and titles", async () => {
    const { stdout } = await run(["docs", "ls"], { cwd: cwd() });
    expect(stdout).toContain("getting-started");
    expect(stdout).toContain("Getting Started");
    expect(stdout).not.toContain("Next:");
  });
});

describe("docs cat", () => {
  it("prints a page as raw markdown", async () => {
    const root = cwd();
    const before = treeSnapshot(root);
    const { stdout, code } = await run(
      ["docs", "cat", "api-reference/fields/text"],
      {
        cwd: root,
      }
    );
    expect(code).toBe(0);
    expect(stdout.startsWith("# Text\n\nRender a `text` input.")).toBe(true);
    expect(stdout).not.toContain("✓");
    expect(treeSnapshot(root)).toEqual(before);
  });

  it.each([
    "api-reference/fields/text.md",
    "/docs/api-reference/fields/text",
    "https://puckeditor.com/docs/api-reference/fields/text#placeholder",
    "https://puckeditor.com/v/0.23.0/docs/api-reference/fields/text.md",
    "fields/text",
    "text",
  ])("resolves %s", async (input) => {
    const { json } = await run(["docs", "cat", input, "--json"], {
      cwd: cwd(),
    });
    expect(json.docs?.page).toMatchObject({
      path: "api-reference/fields/text",
      title: "Text",
      content: expect.stringContaining("### placeholder"),
    });
  });

  it("resolves /docs to the introduction", async () => {
    const { json } = await run(["docs", "cat", "/docs", "--json"], {
      cwd: cwd(),
    });
    expect(json.docs?.page?.path).toBe("index");
  });

  it("lists the pages an ambiguous name matches", async () => {
    const { json, code } = await run(["docs", "cat", "puck", "--json"], {
      cwd: cwd(),
    });
    expect(code).toBe(2);
    expect(json.error).toMatchObject({
      code: "PUCK-CLI-DOC-NOT-FOUND",
      details: {
        pages: [
          "api-reference/components/puck",
          "api-reference/overrides/puck",
        ],
      },
    });
  });

  it("suggests find for a missing page", async () => {
    const { stderr, code } = await run(["docs", "cat", "nope"], { cwd: cwd() });
    expect(code).toBe(2);
    expect(stderr).toContain('No docs page "nope".');
    expect(stderr).toContain("npx @puckeditor/cli docs find nope");
  });
});

describe("docs find", () => {
  it("ranks title matches before heading matches", async () => {
    const { json } = await run(["docs", "find", "text", "--json"], {
      cwd: cwd(),
    });
    expect(json.docs?.pages?.map((p) => p.path)).toEqual([
      "api-reference/fields/text",
      "api-reference/fields/textarea",
    ]);
  });

  it("requires every word to match", async () => {
    const { json } = await run(["docs", "find", "render", "editor", "--json"], {
      cwd: cwd(),
    });
    expect(json.docs?.pages?.map((p) => p.path)).toEqual(["getting-started"]);
  });

  it("ignores comments in code blocks", async () => {
    const { json } = await run(
      ["docs", "find", "install the package", "--json"],
      {
        cwd: cwd(),
      }
    );
    expect(json.docs?.pages).toEqual([]);
    expect(json.message).toContain("docs grep install the package");
  });
});

describe("docs grep", () => {
  it("returns matching lines, case-insensitively", async () => {
    const { json, code } = await run(
      ["docs", "grep", "PLACEHOLDER TEXT", "--json"],
      {
        cwd: cwd(),
      }
    );
    expect(code).toBe(0);
    expect(json.docs?.matches).toEqual([
      {
        path: "api-reference/fields/text",
        line: 9,
        text: "The placeholder text to display when the field is empty.",
      },
      {
        path: "api-reference/fields/textarea",
        line: 9,
        text: "The placeholder text to display when the field is empty.",
      },
    ]);
  });

  it("prints path:line for each match", async () => {
    const { stdout } = await run(["docs", "grep", "@puckeditor/core"], {
      cwd: cwd(),
    });
    expect(stdout).toContain("getting-started:7  npm i @puckeditor/core");
  });

  it("reports no matches as success", async () => {
    const { json, code } = await run(["docs", "grep", "zzz", "--json"], {
      cwd: cwd(),
    });
    expect(code).toBe(0);
    expect(json.docs?.matches).toEqual([]);
    expect(json.message).toBe('No matches for "zzz".');
  });
});

describe("normalizeDocPath", () => {
  it.each([
    ["", "index"],
    ["docs", "index"],
    ["/docs/", "index"],
    ["getting-started.mdx", "getting-started"],
    ["/v/canary/docs/cli?x=1", "cli"],
  ])("%j → %s", (input, expected) => {
    expect(normalizeDocPath(input)).toBe(expected);
  });
});
