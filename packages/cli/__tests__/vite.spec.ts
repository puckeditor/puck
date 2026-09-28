import path from "node:path";
import {
  exists,
  read,
  readRecipe,
  run,
  tmpProject,
  treeSnapshot,
} from "./helpers/harness";
import { viteMinimal } from "./helpers/fixtures";
import { LOCAL_PAGES_MODULE } from "../src/templates/client";

const KEY = ["--api-key", "sk-valid-key"];

const CLIENT_FILES = [
  "src/puck.config.tsx",
  "src/puck/root.tsx",
  "src/puck/editor.tsx",
  "src/puck/page.tsx",
];

describe("Vite apps", () => {
  it("asks where the server comes from, without changing anything", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    const before = treeSnapshot(root);
    const { json, code } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("action_required");
    expect(code).toBe(10);
    expect(json.actions).toEqual([
      expect.objectContaining({
        type: "choose_backend",
        flag: "--backend",
        choices: [
          expect.objectContaining({ value: "add" }),
          expect.objectContaining({ value: "external" }),
          expect.objectContaining({ value: "none" }),
        ],
        rerun: expect.stringContaining("--backend <add|external|none>"),
      }),
    ]);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("doesn't offer `none` with Puck AI", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    const { json } = await run(["init", "--ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.actions[0]).toMatchObject({ type: "choose_backend" });
    expect(
      (json.actions[0] as { choices: { value: string }[] }).choices.map(
        (c) => c.value
      )
    ).toEqual(["add", "external"]);

    const none = await run(
      ["init", "--ai", "--backend", "none", "--yes", "--json", ...KEY],
      { cwd: root }
    );
    expect(none.json.error?.code).toBe("PUCK-CLI-BACKEND-REQUIRED");
  });

  it("adds the editor and a Hono server, matching the vite-ai recipe", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    const { json, runner } = await run(
      ["init", "--ai", "--backend", "add", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.project).toMatchObject({ framework: "vite", appDir: "src" });
    for (const file of [
      ...CLIENT_FILES,
      "src/puck/pages.ts",
      "src/main.tsx",
      "vite.config.ts",
      "server/index.ts",
      "server/prod.ts",
      "server/puck/pages.ts",
      "server/puck/cloud.ts",
    ]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("vite-ai", file),
      });
    }
    // The app's own component is kept; rendering pages is up to the app
    expect(read(root, "src/App.tsx")).toContain("Hello Vite");
    expect(json.actions).toContainEqual(
      expect.objectContaining({ id: "editor:render", required: false })
    );

    const pkg = JSON.parse(read(root, "package.json"));
    expect(pkg.scripts.start).toBe("tsx server/prod.ts");
    expect(pkg.dependencies).toMatchObject({
      "@puckeditor/core": "^0.23.0",
      "@puckeditor/plugin-ai": "^0",
      "@puckeditor/cloud-client": "^0",
      hono: "^4.13.9",
    });
    expect(pkg.devDependencies).toMatchObject({
      "@hono/vite-dev-server": "^0.26.1",
      tsx: "^4.23.0",
    });
    expect(runner.calls).toEqual([
      { command: "npm", args: ["install"], cwd: root },
    ]);
    expect(read(root, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
    expect(json.nextSteps).toContain("# then open http://localhost:5173/edit");

    // Detected as set up, with its own server, on the next run
    const again = await run(["init", "--yes", "--json"], { cwd: root });
    expect(again.json.message).toBe("Already set up. Nothing changed.");
  });

  it("saves pages in the browser with --backend none", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    const { json, runner } = await run(
      ["add", "editor", "--backend", "none", "--yes", "--json"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "src/puck/pages.ts")).toBe(LOCAL_PAGES_MODULE);
    for (const file of CLIENT_FILES) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("vite", file),
      });
    }
    expect(exists(root, "server")).toBe(false);
    expect(read(root, "vite.config.ts")).not.toContain("devServer");
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-BROWSER-STORAGE"
    );
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@^0.23.0",
    ]);
  });

  it("proxies to a server elsewhere, which holds Puck Cloud", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    const { json, runner, code } = await run(
      [
        "init",
        "--ai",
        "--backend",
        "external",
        "--backend-url",
        "http://localhost:3000/",
        "--yes",
        "--json",
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(code).toBe(0);
    expect(read(root, "vite.config.ts")).toContain(`  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },`);
    expect(read(root, "src/puck/editor.tsx")).toBe(
      readRecipe("vite-ai", "src/puck/editor.tsx")
    );
    // No local Cloud route, key or login
    expect(exists(root, "server")).toBe(false);
    expect(exists(root, ".env.local")).toBe(false);
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@^0.23.0",
      "@puckeditor/plugin-ai@^0",
    ]);
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-EXTERNAL-BACKEND"
    );

    const status = await run(["status", "--json"], { cwd: root });
    expect(status.json.cloud).toMatchObject({ configured: true });
    expect(status.json.ai).toMatchObject({ configured: true });
  });

  it("requires --backend-url for an external server", async () => {
    const root = tmpProject({ tree: viteMinimal() });
    const { json } = await run(
      ["add", "editor", "--backend", "external", "--yes", "--json"],
      { cwd: root }
    );
    expect(json.error?.code).toBe("PUCK-CLI-BACKEND-URL-REQUIRED");
  });

  it("turns the vite recipe into the vite-ai recipe", async () => {
    const root = tmpProject({ recipe: "vite" });
    const { json } = await run(["add", "ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    for (const file of [
      "src/puck/editor.tsx",
      "src/puck/page.tsx",
      "server/index.ts",
      "server/puck/cloud.ts",
      "vite.config.ts",
    ]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("vite-ai", file),
      });
    }
  });

  it("scaffolds a new app from the recipe without asking about a server", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      [
        "init",
        "--yes",
        "--json",
        "--ai",
        "--framework",
        "vite",
        "--name",
        "site",
        ...KEY,
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    const app = path.join(root, "site");
    expect(read(app, "src/main.tsx")).toBe(
      readRecipe("vite-ai", "src/main.tsx")
    );
    expect(read(app, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
  });
});
