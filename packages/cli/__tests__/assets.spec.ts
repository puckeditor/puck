import fs from "node:fs";
import path from "node:path";
import { exists, read, run, tmpProject } from "./helpers/harness";
import { nextMinimal, viteMinimal } from "./helpers/fixtures";

const KEY = ["--api-key", "sk-valid-key"];

const codes = (warnings: { code: string }[]) => warnings.map((w) => w.code);

const ASSETS_IMPORTS = `import { createAssetsPlugin } from "@puckeditor/plugin-assets";
import "@puckeditor/plugin-assets/styles.css";`;

/** Runs each `add` in turn, e.g. [["assets"], ["pages"]] */
const addInTurn = async (root: string, runs: string[][]) => {
  for (const capabilities of runs) {
    const { json } = await run(
      ["add", ...capabilities, "--yes", "--json", ...KEY],
      { cwd: root }
    );
    expect({ capabilities, status: json.status }).toEqual({
      capabilities,
      status: "success",
    });
  }
};

const contentOf = (root: string, file: string) =>
  exists(root, file) ? read(root, file) : null;

const expectSameFiles = (a: string, b: string, files: string[]) => {
  for (const file of files) {
    expect({ file, content: contentOf(a, file) }).toEqual({
      file,
      content: contentOf(b, file),
    });
  }
};

/**
 * Where each framework's editor and Cloud route are, the files Assets and the
 * others rewrite, and the Vite config that has to prebundle the plugin
 */
const FRAMEWORKS = [
  {
    recipe: "next",
    editor: "app/puck/[...puckPath]/client.tsx",
    route: "app/api/puck/[...all]/route.ts",
    files: [
      "app/puck/[...puckPath]/client.tsx",
      "app/puck/[...puckPath]/page.tsx",
    ],
  },
  {
    recipe: "react-router",
    editor: "app/routes/puck-splat.tsx",
    route: "app/routes/api.puck.ts",
    files: ["app/routes/puck-splat.tsx", "app/routes/puck.tsx"],
    viteConfig: "vite.config.ts",
  },
  {
    recipe: "tanstack-start",
    editor: "src/routes/$.tsx",
    route: "src/routes/api/puck/$.ts",
    files: ["src/routes/$.tsx", "src/routes/puck.tsx", "src/lib/pages.ts"],
    viteConfig: "vite.config.ts",
  },
  {
    recipe: "vite",
    editor: "src/puck/editor.tsx",
    route: "server/puck/cloud.ts",
    files: ["src/puck/editor.tsx", "src/puck/root.tsx"],
    viteConfig: "vite.config.ts",
  },
  {
    recipe: "astro",
    editor: "src/puck/editor.tsx",
    route: "src/pages/api/puck/[...all].ts",
    files: [
      "src/puck/editor.tsx",
      "src/pages/[...puckPath].astro",
      "src/pages/puck.astro",
    ],
  },
] as const;

describe("add assets", () => {
  describe.each(["next", "vinext"] as const)("%s", (recipe) => {
    it("adds the asset library to the editor and Cloud route", async () => {
      const root = tmpProject({ recipe });
      const { json, runner } = await run(
        ["add", "assets", "--yes", "--json", ...KEY],
        { cwd: root }
      );

      expect(json.status).toBe("success");
      expect(json.message).toBe("Set up Puck Cloud and Puck Assets.");
      expect(runner.calls[0].args).toEqual([
        "install",
        "@puckeditor/cloud-client@^0.9.0-0",
        "@puckeditor/plugin-assets@^0.9.0-0",
      ]);

      const client = read(root, "app/puck/[...puckPath]/client.tsx");
      expect(client).toContain(ASSETS_IMPORTS);
      expect(client).toContain("const assetsPlugin = createAssetsPlugin();");
      expect(client).toContain("plugins={[assetsPlugin]}");

      expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
        "puckHandler(request, { authenticate: () => ({ id: null }) })"
      );

      expect(codes(json.warnings)).toContain(
        "PUCK-CLI-W-ASSETS-UNAUTHENTICATED"
      );
      expect(codes(json.warnings)).not.toContain("PUCK-CLI-W-NO-CLIENT-PLUGIN");
      expect(json.assets).toEqual({ installed: true, configured: true });

      const again = await run(["add", "assets", "--yes", "--json"], {
        cwd: root,
      });
      expect(again.json.changed).toBe(false);
    });
  });

  it("doesn't warn with Puck Auth", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await run(
      ["add", "auth", "assets", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(codes(json.warnings)).not.toContain(
      "PUCK-CLI-W-ASSETS-UNAUTHENTICATED"
    );
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toContain(
      "plugins={[authPlugin, assetsPlugin]}"
    );
    expect(read(root, "app/api/puck/[...all]/route.ts")).toContain(
      "puckHandler(request, { authenticate })"
    );
  });

  describe.each(FRAMEWORKS)("$recipe editor", (framework) => {
    const { recipe, editor, route, files } = framework;
    it("adds the asset library to the editor and Cloud route", async () => {
      const root = tmpProject({ recipe });
      const { json } = await run(["add", "assets", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(read(root, editor)).toContain(ASSETS_IMPORTS);
      expect(read(root, route)).toContain("authenticate: () => ({ id: null })");
      expect(json.assets).toEqual({ installed: true, configured: true });
      if ("viteConfig" in framework)
        expect(read(root, framework.viteConfig)).toContain(
          '"@puckeditor/plugin-assets"'
        );
    });

    it.each(
      [["auth"], ["pages"], ["ai"], ["pages", "auth"]].map(
        (others) => [others.join(" and "), others] as const
      )
    )("ends up the same whichever comes first, with %s", async (_, others) => {
      const together = tmpProject({ recipe });
      await addInTurn(together, [[...others, "assets"]]);

      const assetsFirst = tmpProject({ recipe });
      await addInTurn(assetsFirst, [["assets"], others]);

      const assetsLast = tmpProject({ recipe });
      await addInTurn(assetsLast, [others, ["assets"]]);

      const all = [...files, route];
      expectSameFiles(assetsFirst, together, all);
      expectSameFiles(assetsLast, together, all);
    });
  });

  it("leaves a Vite app's Cloud route to a server elsewhere", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    await run(
      [
        "add",
        "editor",
        "--backend",
        "external",
        "--backend-url",
        "http://localhost:3000",
        "--yes",
        "--json",
      ],
      { cwd: root }
    );
    const { json } = await run(["add", "assets", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(exists(root, "server")).toBe(false);
    expect(codes(json.warnings)).toContain("PUCK-CLI-W-EXTERNAL-ASSETS");
    expect(json.assets).toEqual({ installed: true, configured: true });
  });

  it.each(["hono", "express-ai"])(
    "serves the asset library from the %s Cloud route",
    async (recipe) => {
      const root = tmpProject({ recipe });
      const { json } = await run(["add", "assets", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      expect(json.message).toBe("Set up Puck Cloud and Puck Assets.");
      // The plugin goes in the editor's app
      const { dependencies } = JSON.parse(read(root, "package.json"));
      expect(dependencies["@puckeditor/cloud-client"]).toBe("^0.9.0-0");
      expect(dependencies).not.toHaveProperty("@puckeditor/plugin-assets");
      expect(read(root, "src/puck/cloud.ts")).toContain(
        "authenticate: () => ({ id: null })"
      );
      expect(codes(json.warnings)).toContain("PUCK-CLI-W-ASSETS-EDITOR");
      expect(json.assets).toEqual({ installed: true, configured: true });
    }
  );

  it("asks for a manual edit in a customised editor", async () => {
    const root = tmpProject({ recipe: "next" });
    const client = path.join(root, "app/puck/[...puckPath]/client.tsx");
    fs.writeFileSync(
      client,
      `"use client";

import { Puck } from "@puckeditor/core";
import { plugins } from "../../../lib/plugins";

export function Client() {
  return <Puck config={{ components: {} }} data={{}} plugins={plugins} />;
}
`
    );

    const { json } = await run(["add", "assets", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("partial");
    expect(json.actions).toContainEqual(
      expect.objectContaining({
        id: "assets:editor",
        type: "manual_edit",
        capability: "assets",
        file: "app/puck/[...puckPath]/client.tsx",
        snippet: expect.stringContaining("createAssetsPlugin"),
      })
    );
  });
});

describe("init --assets", () => {
  it("scaffolds an app with the asset library", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      [
        "init",
        "--assets",
        "--framework",
        "next",
        "--name",
        "site",
        "--yes",
        "--json",
        ...KEY,
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe(
      "Set up Puck Editor, Puck Cloud and Puck Assets."
    );
    const app = path.join(root, "site");
    expect(JSON.parse(read(app, "package.json")).dependencies).toMatchObject({
      "@puckeditor/cloud-client": "^0.9.0-0",
      "@puckeditor/plugin-assets": "^0.9.0-0",
    });
    expect(read(app, "app/puck/[...puckPath]/client.tsx")).toContain(
      "plugins={[assetsPlugin]}"
    );
    expect(json.assets).toEqual({ installed: true, configured: true });
  });

  it("is included by default, and left out with --no-assets", async () => {
    const all = tmpProject({ tree: nextMinimal() });
    const { json } = await run(["init", "--no-ai", "--yes", "--json", ...KEY], {
      cwd: all,
    });
    expect(json.status).toBe("success");
    expect(json.assets).toEqual({ installed: true, configured: true });

    const without = tmpProject({ tree: nextMinimal() });
    const none = await run(["init", "--no-assets", "--yes", "--json", ...KEY], {
      cwd: without,
    });
    expect(none.json.status).toBe("success");
    expect(none.json.assets).toMatchObject({ installed: false });
    expect(none.json.pages).toMatchObject({ installed: true });
  });

  it.each([[["--assets", "--no-assets"]], [["--assets", "--editor-only"]]])(
    "rejects %j",
    async (flags) => {
      const { json, code } = await run(["init", ...flags, "--json"], {
        cwd: tmpProject({ tree: nextMinimal() }),
      });
      expect(code).toBe(2);
      expect(json.error?.code).toBe("PUCK-CLI-INVALID-ARGS");
    }
  );
});
