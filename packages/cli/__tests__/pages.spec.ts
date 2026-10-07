import fs from "node:fs";
import path from "node:path";
import { read, readRecipe, run, tmpProject } from "./helpers/harness";
import {
  cloudPagesServer,
  TANSTACK_PAGES_SPLAT,
  tanstackPagesEditor,
  tanstackPagesLib,
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

  describe("react-router", () => {
    it("edits at /puck and renders published pages", async () => {
      const root = tmpProject({ recipe: "react-router" });
      const { json } = await run(["add", "pages", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(read(root, "app/routes.ts"))
        .toContain(`  route("puck", "routes/puck.tsx"),
  route("*", "routes/puck-splat.tsx"),`);
      expect(read(root, "app/routes/puck.tsx")).toContain(
        "<Puck plugins={[pagesPlugin]} config={config} data={{}} />"
      );
      const splat = read(root, "app/routes/puck-splat.tsx");
      expect(splat).toContain(
        "throw redirect(`/puck?path=${encodeURIComponent(path)}`);"
      );
      expect(splat).not.toContain("<Puck");
      expect(read(root, "app/lib/pages.server.ts")).toBe(cloudPagesServer());
      expect(read(root, "vite.config.ts")).toContain(
        'include: ["@puckeditor/core", "@puckeditor/plugin-pages"]'
      );
      expect(read(root, "app/routes/api.puck.ts")).toContain(
        "const options: PuckHandlerOptions = { authenticate: () => ({ id: null }) };"
      );

      const again = await run(["add", "pages", "--yes", "--json"], {
        cwd: root,
      });
      expect(again.json.changed).toBe(false);
    });

    it("keeps Puck AI, before or after", async () => {
      const aiFirst = tmpProject({ recipe: "react-router-ai" });
      await run(["add", "pages", "--yes", "--json", ...KEY], { cwd: aiFirst });

      const pagesFirst = tmpProject({ recipe: "react-router" });
      await run(["add", "pages", "--yes", "--json", ...KEY], {
        cwd: pagesFirst,
      });
      const { json } = await run(["add", "ai", "--yes", "--json"], {
        cwd: pagesFirst,
      });
      expect(json.status).toBe("success");

      for (const file of [
        "app/routes/puck.tsx",
        "app/routes/puck-splat.tsx",
        "app/components/puck-render.tsx",
      ]) {
        expect({ file, content: read(pagesFirst, file) }).toEqual({
          file,
          content: read(aiFirst, file),
        });
      }
      expect(read(aiFirst, "app/routes/puck.tsx")).toContain(
        "const plugins = [aiPlugin, pagesPlugin, blocksPlugin(), outlinePlugin()];"
      );
    });
  });

  describe("tanstack-start", () => {
    it("edits at /puck and renders published pages", async () => {
      const root = tmpProject({ recipe: "tanstack-start" });
      const { json } = await run(["add", "pages", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(read(root, "src/routes/$.tsx")).toBe(TANSTACK_PAGES_SPLAT);
      expect(read(root, "src/lib/pages.ts")).toBe(tanstackPagesLib);
      expect(read(root, "src/lib/pages.server.ts")).toBe(cloudPagesServer());
      expect(read(root, "src/routes/puck.tsx")).toBe(
        tanstackPagesEditor({ ai: false, auth: false })
      );

      const again = await run(["add", "pages", "--yes", "--json"], {
        cwd: root,
      });
      expect(again.json.changed).toBe(false);
    });

    it("keeps Puck AI, before or after", async () => {
      const aiFirst = tmpProject({ recipe: "tanstack-start-ai" });
      await run(["add", "pages", "--yes", "--json", ...KEY], { cwd: aiFirst });
      expect(read(aiFirst, "src/routes/puck.tsx")).toBe(
        tanstackPagesEditor({ ai: true, auth: false })
      );

      const pagesFirst = tmpProject({ recipe: "tanstack-start" });
      await run(["add", "pages", "--yes", "--json", ...KEY], {
        cwd: pagesFirst,
      });
      const { json } = await run(["add", "ai", "--yes", "--json"], {
        cwd: pagesFirst,
      });
      expect(json.status).toBe("success");
      for (const file of [
        "src/routes/puck.tsx",
        "src/routes/$.tsx",
        "src/components/puck-render.tsx",
      ]) {
        expect({ file, content: read(pagesFirst, file) }).toEqual({
          file,
          content: read(aiFirst, file),
        });
      }
    });
  });
});
