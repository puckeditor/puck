import path from "node:path";
import { exists, read, readRecipe, run, tmpProject } from "./helpers/harness";
import { expressMinimal, honoMinimal, nextMinimal } from "./helpers/fixtures";
import { normalizeModule } from "./helpers/semantic";

const KEY = ["--api-key", "sk-valid-key"];

describe("servers (Hono and Express)", () => {
  it("sets up the pages API, Puck Cloud and AI in a create-hono app", async () => {
    const root = tmpProject({ tree: honoMinimal() });
    const { json, runner } = await run(
      ["init", "--ai", "--yes", "--json", ...KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe("Set up Puck pages API, Puck Cloud and Puck AI.");
    expect(json.project).toMatchObject({ framework: "hono", appDir: "src" });
    for (const file of ["src/puck/pages.ts", "src/puck/cloud.ts"]) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("hono-ai", file),
      });
    }
    // Relative imports need .js under module: NodeNext; quotes match the file
    expect(read(root, "src/index.ts")).toContain(
      "import { puckPages } from './puck/pages.js'\nimport { puckCloud } from './puck/cloud.js'"
    );
    expect(read(root, "src/index.ts")).toContain(
      "app.route('/', puckPages)\napp.route('/', puckCloud)\n\nserve({"
    );

    // Editing package.json and installing are folded into one full install
    const pkg = JSON.parse(read(root, "package.json"));
    expect(pkg.scripts.dev).toBe(
      "tsx watch --env-file-if-exists=.env.local src/index.ts"
    );
    expect(pkg.dependencies).toMatchObject({
      "@puckeditor/cloud-client": "^0",
      react: "^19.0.0",
    });
    expect(pkg.dependencies["@puckeditor/core"]).toBeUndefined();
    expect(pkg.dependencies["@puckeditor/plugin-ai"]).toBeUndefined();
    expect(runner.calls).toEqual([
      { command: "npm", args: ["install"], cwd: root },
    ]);
    expect(exists(root, "puck.config.tsx")).toBe(false);
    expect(read(root, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
    expect(json.puck).toMatchObject({ configured: true });
    expect(json.ai).toMatchObject({ configured: true });
    expect(json.nextSteps).toContain(
      "# then open http://localhost:3000/api/pages?path=/"
    );

    const doctor = await run(["doctor", "--json", "--offline"], { cwd: root });
    const checks = doctor.json.findings!.map((f) => [f.check, f.status]);
    expect(checks).toContainEqual(["puck.pages_api", "ok"]);
    expect(checks).toContainEqual(["cloud.route_registered", "ok"]);
    expect(checks.map(([c]) => c)).not.toContain("puck.editor");
    expect(checks.map(([c]) => c)).not.toContain("ai.plugin_installed");
  });

  it("asks about Puck AI, Pages and Auth in server terms", async () => {
    const root = tmpProject({ tree: honoMinimal() });
    const { json } = await run(["init", "--json"], { cwd: root });

    expect(json.status).toBe("action_required");
    expect(json.actions[0]).toMatchObject({
      type: "choose_capabilities",
      choices: [
        { value: "--ai", description: "Serve Puck AI for your editor" },
        {
          value: "--pages",
          description: "Serve pages published in Puck Cloud",
        },
        {
          value: "--auth",
          description: "Require Sign in with Puck for Puck Cloud requests",
        },
      ],
    });
  });

  it("sets up only the pages API without AI", async () => {
    const root = tmpProject({ tree: expressMinimal() });
    const { json, runner } = await run(
      ["init", "--editor-only", "--yes", "--json"],
      {
        cwd: root,
      }
    );

    expect(json.status).toBe("success");
    expect(json.message).toBe("Set up Puck pages API.");
    expect(read(root, "src/puck/pages.ts")).toBe(
      readRecipe("express", "src/puck/pages.ts")
    );
    // After the user's routes, before listen
    expect(read(root, "src/index.ts")).toContain(
      "});\n\napp.use(puckPages);\n\napp.listen("
    );
    expect(exists(root, "src/puck/cloud.ts")).toBe(false);
    expect(runner.calls).toEqual([]);
  });

  it.each(["hono", "express"] as const)(
    "turns the %s recipe into the %s-ai recipe",
    async (recipe) => {
      const root = tmpProject({ recipe });
      const { json } = await run(["add", "ai", "--yes", "--json", ...KEY], {
        cwd: root,
      });

      expect(json.status).toBe("success");
      for (const file of ["src/index.ts", "src/puck/cloud.ts"]) {
        expect({ file, content: read(root, file) }).toEqual({
          file,
          content: readRecipe(`${recipe}-ai`, file),
        });
      }
      expect(JSON.parse(read(root, "package.json")).scripts).toEqual(
        JSON.parse(readRecipe(`${recipe}-ai`, "package.json")).scripts
      );
    }
  );

  it("adds a Cloud route without AI options for `add cloud`", async () => {
    const root = tmpProject({ recipe: "express" });
    const { json } = await run(["add", "cloud", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    const route = "src/puck/cloud.ts";
    expect(normalizeModule(read(root, route), route)).toBe(
      normalizeModule(readRecipe("express-ai", route), route, {
        dropProperties: ["ai"],
      })
    );
  });

  it("doesn't touch the dev script on Bun, which loads .env.local itself", async () => {
    const root = tmpProject({ tree: honoMinimal("bun") });
    const { json } = await run(["init", "--ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(JSON.parse(read(root, "package.json")).scripts.dev).toBe(
      "bun run --hot src/index.ts"
    );
    // No module: nodenext, so no extension
    expect(read(root, "src/index.ts")).toBe(`import { Hono } from 'hono'
import { puckPages } from './puck/pages'
import { puckCloud } from './puck/cloud'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

app.route('/', puckPages)
app.route('/', puckCloud)

export default app
`);
  });

  it("explains Workers' .dev.vars instead of editing scripts", async () => {
    const root = tmpProject({ tree: honoMinimal("workers") });
    const { json } = await run(["init", "--ai", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.actions).toContainEqual(
      expect.objectContaining({ type: "manual_edit", file: ".dev.vars" })
    );
    expect(JSON.parse(read(root, "package.json")).scripts.dev).toBe(
      "wrangler dev"
    );
  });

  it("asks for the routes to be mounted when there's no entry file", async () => {
    const root = tmpProject({ tree: expressMinimal({ entry: null }) });
    const { json } = await run(["init", "--editor-only", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.actions).toContainEqual(
      expect.objectContaining({
        type: "manual_edit",
        id: "editor:mount",
        snippet:
          'import { puckPages } from "./puck/pages.js";\n\napp.use(puckPages);',
      })
    );
    expect(exists(root, "puck/pages.ts")).toBe(true);
  });

  it("prefers the app framework when a server lives next to it", async () => {
    const tree = nextMinimal();
    const pkg = JSON.parse(tree["package.json"] as string);
    pkg.dependencies.express = "^5.2.1";
    tree["package.json"] = JSON.stringify(pkg);
    const root = tmpProject({ tree });
    const { json } = await run(["status", "--json"], { cwd: root });

    expect(json.project?.framework).toBe("next");
  });

  it("scaffolds a new server app from the AI recipe", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      [
        "init",
        "--yes",
        "--json",
        "--ai",
        "--framework",
        "hono",
        "--name",
        "api",
        ...KEY,
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    const app = path.join(root, "api");
    expect(read(app, "src/index.ts")).toBe(
      readRecipe("hono-ai", "src/index.ts")
    );
    expect(read(app, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
    expect(JSON.parse(read(app, "package.json")).name).toBe("api");
  });
});
