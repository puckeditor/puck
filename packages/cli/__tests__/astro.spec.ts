import path from "node:path";
import {
  exists,
  read,
  readRecipe,
  run,
  tmpProject,
  treeSnapshot,
} from "./helpers/harness";
import { astroMinimal } from "./helpers/fixtures";
import { ASTRO_EDITOR_PAGE, LOCAL_PAGES_MODULE } from "../src/templates/client";

const KEY = ["--api-key", "sk-valid-key"];

const SERVER_FILES = [
  "src/pages/[...puckPath].astro",
  "src/pages/api/pages.ts",
  "src/lib/pages.ts",
  "src/lib/resolve-puck-path.ts",
  "src/puck/editor.tsx",
  "src/puck/pages.ts",
  "src/puck/render.tsx",
  "src/puck.config.tsx",
];

describe("Astro sites", () => {
  it("asks whether to add an adapter when there isn't one", async () => {
    const root = tmpProject({ tree: astroMinimal() });
    const before = treeSnapshot(root);
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("action_required");
    expect(json.actions[0]).toMatchObject({
      type: "choose_backend",
      choices: [
        {
          value: "add",
          label: expect.stringContaining("Node adapter (@astrojs/node)"),
        },
        { value: "external" },
        { value: "none" },
      ],
    });
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("adds React and the Node adapter with astro add, then the recipe's routes", async () => {
    const root = tmpProject({ tree: astroMinimal() });
    const { json, runner } = await run(
      ["add", "editor", "--backend", "add", "--yes", "--json"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(runner.calls).toEqual([
      {
        command: "npm",
        args: ["install", "@puckeditor/core@^0.23.0"],
        cwd: root,
      },
      {
        command: "npx",
        args: ["astro", "add", "react", "node", "--yes"],
        cwd: root,
      },
    ]);
    for (const file of SERVER_FILES) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("astro", file),
      });
    }
    expect(read(root, "src/pages/index.astro")).toContain("<h1>Astro</h1>");
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-HOME-NOT-MANAGED"
    );
  });

  it("uses an adapter that's already there, matching the astro-ai recipe", async () => {
    const root = tmpProject({ tree: astroMinimal({ withAdapter: true }) });
    const { json, runner } = await run(
      ["init", "--ai", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(runner.calls.map((c) => c.command)).toEqual(["npm"]);
    for (const file of [...SERVER_FILES, "src/pages/api/puck/[...all].ts"]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("astro-ai", file),
      });
    }
    expect(read(root, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
    expect(json.nextSteps).toContain("# then open http://localhost:4321/edit");
  });

  it("adds a static editor page that saves in the browser with --backend none", async () => {
    const root = tmpProject({ tree: astroMinimal() });
    const { json, runner } = await run(
      ["add", "editor", "--backend", "none", "--yes", "--json"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(runner.calls[1].args).toEqual(["astro", "add", "react", "--yes"]);
    expect(read(root, "src/pages/edit.astro")).toBe(ASTRO_EDITOR_PAGE);
    expect(read(root, "src/puck/pages.ts")).toBe(LOCAL_PAGES_MODULE);
    expect(read(root, "src/puck/editor.tsx")).toBe(
      readRecipe("astro", "src/puck/editor.tsx")
    );
    expect(exists(root, "src/pages/[...puckPath].astro")).toBe(false);
    expect(exists(root, "src/pages/api")).toBe(false);
    expect(json.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining([
        "PUCK-CLI-W-STATIC-EDITOR",
        "PUCK-CLI-W-BROWSER-STORAGE",
      ])
    );
  });

  it("proxies /api to a server elsewhere with --backend external", async () => {
    const root = tmpProject({ tree: astroMinimal() });
    const { json } = await run(
      [
        "init",
        "--ai",
        "--backend",
        "external",
        "--backend-url",
        "http://localhost:3000",
        "--yes",
        "--json",
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "astro.config.mjs")).toBe(`// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
  },
});
`);
    expect(read(root, "src/puck/editor.tsx")).toBe(
      readRecipe("astro-ai", "src/puck/editor.tsx")
    );
    expect(exists(root, ".env.local")).toBe(false);
    expect(exists(root, "src/pages/api")).toBe(false);

    const status = await run(["status", "--json"], { cwd: root });
    expect(status.json.cloud).toMatchObject({ configured: true });
  });

  it("leaves an existing catch-all route alone", async () => {
    const tree = {
      ...astroMinimal({ withAdapter: true }),
      "src/pages/[...slug].astro": "---\n---\n",
    };
    const root = tmpProject({ tree });
    const { json } = await run(["init", "--editor-only", "--yes", "--json"], {
      cwd: root,
    });

    expect(exists(root, "src/pages/[...puckPath].astro")).toBe(false);
    expect(json.actions).toContainEqual(
      expect.objectContaining({
        id: "editor:catch-all",
        file: "src/pages/[...slug].astro",
      })
    );
  });

  it("turns the astro recipe into the astro-ai recipe", async () => {
    const root = tmpProject({ recipe: "astro" });
    const { json } = await run(["add", "ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    for (const file of [
      "src/puck/editor.tsx",
      "src/puck/render.tsx",
      "src/pages/api/puck/[...all].ts",
    ]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("astro-ai", file),
      });
    }
  });

  it("scaffolds a new site from the AI recipe", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      [
        "init",
        "--yes",
        "--json",
        "--ai",
        "--framework",
        "astro",
        "--name",
        "site",
        ...KEY,
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    const app = path.join(root, "site");
    expect(read(app, "astro.config.mjs")).toBe(
      readRecipe("astro-ai", "astro.config.mjs")
    );
    expect(read(app, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
  });
});
