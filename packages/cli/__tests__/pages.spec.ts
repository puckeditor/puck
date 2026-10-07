import fs from "node:fs";
import path from "node:path";
import { read, readRecipe, run, tmpProject } from "./helpers/harness";
import {
  NEXT_PAGES_PROXY,
  nextPagesEditorClient,
  nextPagesEditorPage,
  nextPagesRenderPage,
} from "../src/templates/pages";

const KEY = ["--api-key", "sk-valid-key"];

const codes = (warnings: { code: string }[]) => warnings.map((w) => w.code);

describe("add pages", () => {
  describe.each(["next", "vinext"] as const)("%s", (recipe) => {
    it("moves the editor and public pages to Puck Cloud", async () => {
      const root = tmpProject({ recipe });
      const { json, runner } = await run(
        ["add", "pages", "--yes", "--json", ...KEY],
        { cwd: root }
      );

      expect(json.status).toBe("success");
      expect(json.message).toBe("Set up Puck Cloud and Puck Pages.");
      expect(runner.calls[0].args).toEqual([
        "install",
        "@puckeditor/cloud-client@^0.9.0-0",
        "@puckeditor/plugin-pages@^0.9.0-0",
      ]);
      expect(read(root, "app/puck/[...puckPath]/client.tsx")).toBe(
        nextPagesEditorClient({ ai: false })
      );
      expect(read(root, "app/puck/[...puckPath]/page.tsx")).toBe(
        nextPagesEditorPage({ ai: false, auth: false })
      );
      expect(read(root, "app/[...puckPath]/page.tsx")).toBe(
        nextPagesRenderPage()
      );
      expect(read(root, "proxy.ts")).toBe(NEXT_PAGES_PROXY);
      // cloud-client's Pages release requires authenticate
      expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
        "puckHandler(request, { authenticate: () => ({ id: null }) })"
      );
      expect(codes(json.warnings)).toEqual(
        expect.arrayContaining([
          "PUCK-CLI-W-PAGES-UNAUTHENTICATED",
          "PUCK-CLI-W-LOCAL-PAGES",
        ])
      );
      expect(codes(json.warnings)).not.toContain("PUCK-CLI-W-NO-CLIENT-PLUGIN");

      const again = await run(["add", "pages", "--yes", "--json"], {
        cwd: root,
      });
      expect(again.json.changed).toBe(false);
    });
  });

  it("keeps Puck AI in the editor", async () => {
    const root = tmpProject({ recipe: "next-ai" });
    const { json } = await run(["add", "pages", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toBe(
      nextPagesEditorClient({ ai: true })
    );
    expect(read(root, "app/puck/[...puckPath]/page.tsx")).toBe(
      nextPagesEditorPage({ ai: true, auth: false })
    );
    // Keeps the route's AI options
    expect(read(root, "app/api/puck/[...all]/route.ts")).toBe(
      readRecipe("next-ai", "app/api/puck/[...all]/route.ts").replace(
        "puckHandler(request, {\n",
        "puckHandler(request, {\n    authenticate: () => ({ id: null }),\n"
      )
    );
  });

  it("can add Puck AI to a Pages editor", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(["add", "pages", "--yes", "--json", ...KEY], { cwd: root });
    const { json } = await run(["add", "ai", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(json.warnings.map((w) => w.code)).not.toContain(
      "PUCK-CLI-W-AI-ROUTE"
    );
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toBe(
      nextPagesEditorClient({ ai: true })
    );
    expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
      "authenticate: () => ({ id: null }),\n    ai: {"
    );
    // Pages are saved to Puck Cloud, not /api/pages
    expect(fs.existsSync(path.join(root, "app/api/pages/route.ts"))).toBe(
      false
    );
  });

  it("does the same in one run", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await run(
      ["add", "pages", "ai", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toBe(
      nextPagesEditorClient({ ai: true })
    );
  });

  it("asks for a manual edit when the editor was customised", async () => {
    const root = tmpProject({ recipe: "next" });
    const client = path.join(root, "app/puck/[...puckPath]/client.tsx");
    fs.writeFileSync(client, `${fs.readFileSync(client, "utf8")}\n// mine\n`);

    const { json } = await run(["add", "pages", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("partial");
    expect(json.actions).toContainEqual(
      expect.objectContaining({
        type: "manual_edit",
        capability: "pages",
        file: "app/puck/[...puckPath]/client.tsx",
        required: true,
        snippet: nextPagesEditorClient({ ai: false }),
      })
    );
    expect(fs.readFileSync(client, "utf8")).toContain("// mine");
  });

  it("reads published pages from PUCK_CLOUD_URL", async () => {
    const root = tmpProject({ recipe: "next" });
    const host = "http://localhost:3000";
    await run(["add", "pages", "--yes", "--json", ...KEY], {
      cwd: root,
      env: { PUCK_CLOUD_URL: host },
    });

    expect(read(root, "app/[...puckPath]/page.tsx")).toBe(
      nextPagesRenderPage(`${host}/api`)
    );
  });
});
