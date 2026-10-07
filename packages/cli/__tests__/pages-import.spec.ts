import fs from "node:fs";
import path from "node:path";
import { FakeCloud, readRecipe, run, tmpProject } from "./helpers/harness";

const KEY = ["--api-key", "sk-valid-key"];

const page = (title: string) => ({ content: [], root: { props: { title } } });

/** A project with pages.json holding `count` pages */
const withPages = (count: number, extra: Record<string, string> = {}) =>
  tmpProject({
    tree: {
      "pages.json": JSON.stringify(
        Object.fromEntries(
          Array.from({ length: count }, (_, i) => [
            i ? `/page-${i}` : "/",
            page(`Page ${i}`),
          ])
        )
      ),
      ...extra,
    },
  });

const imports = (cloud: FakeCloud) =>
  cloud.requests.filter((r) => r.path === "/api/pages/batch");

describe("pages import", () => {
  it("publishes a recipe's database.json to Puck Cloud", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json, code, cloud } = await run(
      ["pages", "import", "database.json", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    const routes = Object.keys(JSON.parse(readRecipe("next", "database.json")));
    expect(code).toBe(0);
    expect(json).toMatchObject({
      command: "pages",
      status: "success",
      changed: true,
      pagesImport: {
        file: "database.json",
        total: routes.length,
        created: routes,
        skipped: [],
        notImported: [],
      },
    });
    const [request] = imports(cloud);
    expect(request.headers["x-api-key"]).toBe("sk-valid-key");
    // A branch-scoped key says which project and branch
    expect(request.headers["x-puck-project-id"]).toBeUndefined();
    expect(request.body).toEqual({
      pages: JSON.parse(readRecipe("next", "database.json")),
    });
  });

  it("sends pages in batches of 100", async () => {
    const root = withPages(250);
    const { json, cloud } = await run(
      ["pages", "import", "pages.json", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe("Published 250 pages to Puck Cloud.");
    expect(
      imports(cloud).map(
        (r) => Object.keys((r.body as { pages: object }).pages).length
      )
    ).toEqual([100, 100, 50]);
  });

  it("keeps pages that already exist", async () => {
    const root = withPages(3);
    const cloud = new FakeCloud();
    cloud.pageRoutes.add("/");

    const { json } = await run(
      ["pages", "import", "pages.json", "--yes", "--json", ...KEY],
      { cwd: root, cloud }
    );

    expect(json.message).toBe(
      "Published 2 pages to Puck Cloud, and skipped 1 that already exists."
    );
    expect(json.pagesImport?.skipped).toEqual(["/"]);
  });

  it("reports what was imported when a batch fails", async () => {
    const root = withPages(250);
    const cloud = new FakeCloud();
    cloud.failImportAt = 2;

    const { json, code } = await run(
      ["pages", "import", "pages.json", "--yes", "--json", ...KEY],
      { cwd: root, cloud }
    );

    expect(code).toBe(11);
    expect(json.status).toBe("partial");
    expect(json.pagesImport?.created).toHaveLength(100);
    expect(json.pagesImport?.notImported).toHaveLength(150);

    // Re-running skips what made it
    const again = await run(
      ["pages", "import", "pages.json", "--yes", "--json", ...KEY],
      { cwd: root, cloud }
    );
    expect(again.json.status).toBe("success");
    expect(again.json.pagesImport?.created).toHaveLength(150);
    expect(again.json.pagesImport?.skipped).toHaveLength(100);
  });

  it("asks for consent before publishing", async () => {
    const root = withPages(2);
    const { json, code, cloud } = await run(
      ["pages", "import", "pages.json", "--json", ...KEY],
      { cwd: root }
    );

    expect(code).toBe(10);
    expect(json.status).toBe("action_required");
    expect(json.actions).toEqual([
      expect.objectContaining({
        type: "confirm_plan",
        rerun: "npx @puckeditor/cli pages import pages.json --json --yes",
      }),
    ]);
    expect(imports(cloud)).toHaveLength(0);
  });

  it("only checks the file in a dry run", async () => {
    const root = withPages(2);
    const { json, cloud } = await run(
      ["pages", "import", "pages.json", "--dry-run", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe(
      "Dry run: would import and publish 2 pages from pages.json to Puck Cloud."
    );
    expect(cloud.networkCalls).toBe(0);
  });

  it("uses the key in the project's env file", async () => {
    const root = withPages(1, { ".env.local": "PUCK_API_KEY=sk-valid-key\n" });
    const { json, stdout } = await run(
      ["pages", "import", "pages.json", "--yes", "--json"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(stdout).not.toContain("sk-valid-key");
  });

  it("asks for a key when there isn't one", async () => {
    const root = withPages(1);
    const { json, code } = await run(
      ["pages", "import", "pages.json", "--yes", "--json"],
      { cwd: root }
    );

    expect(code).toBe(10);
    expect(json.actions[0]).toMatchObject({
      type: "provide_api_key",
      flag: "--api-key",
      env: "PUCK_API_KEY",
    });
    expect(json.nextSteps).toEqual(["npx @puckeditor/cli connect"]);
  });

  it("explains a rejected key", async () => {
    const root = withPages(1);
    const { json, code } = await run(
      [
        "pages",
        "import",
        "pages.json",
        "--yes",
        "--json",
        "--api-key",
        "sk-revoked-key",
      ],
      { cwd: root }
    );

    expect(code).toBe(2);
    expect(json.error).toMatchObject({
      code: "PUCK-CLI-API-KEY-REJECTED",
      details: { fix: "npx @puckeditor/cli connect" },
    });
  });

  it.each([
    ["a missing file", null, "missing.json doesn't exist."],
    ["invalid JSON", "{", "missing.json isn't valid JSON"],
    ["an array", "[]", "must be an object of Puck data keyed by route"],
    [
      "a route without a slash",
      JSON.stringify({ about: page("About") }),
      `"about" in missing.json isn't a route starting with /.`,
    ],
  ])("rejects %s", async (_, content, message) => {
    const root = tmpProject("empty");
    if (content !== null)
      fs.writeFileSync(path.join(root, "missing.json"), content);

    const { json, code } = await run(
      ["pages", "import", "missing.json", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(code).toBe(2);
    expect(json.error?.code).toBe("PUCK-CLI-PAGES-FILE-INVALID");
    expect(json.error?.message).toContain(message);
  });

  it("needs a subcommand and a file", async () => {
    const { json, code } = await run(["pages", "--json"], {
      cwd: tmpProject("empty"),
    });
    expect(code).toBe(2);
    expect(json.error?.message).toBe(
      "Usage: `npx @puckeditor/cli pages import <file.json>`."
    );
  });
});
