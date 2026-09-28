import fs from "node:fs";
import path from "node:path";
import { exists, read, readRecipe, run, tmpProject } from "./helpers/harness";
import { normalizeModule } from "./helpers/semantic";

const KEY = "sk-valid-key";

describe("add cloud", () => {
  it("matches the next-ai recipe's cloud integration on the next recipe", async () => {
    const root = tmpProject({ recipe: "next" });
    const gitignoreBefore = read(root, ".gitignore");

    const { code, json, runner } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(code).toBe(0);
    expect(runner.calls).toEqual([
      {
        command: "npm",
        args: ["install", "@puckeditor/cloud-client@^0"],
        cwd: root,
      },
    ]);

    const route = "app/api/puck/[...all]/route.ts";
    expect(normalizeModule(read(root, route), route)).toBe(
      normalizeModule(readRecipe("next-ai", route), route, {
        dropProperties: ["ai"],
      })
    );

    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${KEY}\n`);
    expect(fs.statSync(path.join(root, ".env.local")).mode & 0o777).toBe(0o600);
    // The recipe already ignores .env.local
    expect(read(root, ".gitignore")).toBe(gitignoreBefore);

    expect(json.plan?.steps.map((s) => s.capability)).not.toContain("editor");
    expect(json.cloud).toMatchObject({
      configured: true,
      verified: "remote",
      apiKey: { present: true, source: ".env.local" },
    });
    expect(json.filesCreated).toEqual([".env.local", route]);
  });

  it("matches the tanstack-start-ai recipe's cloud integration on the tanstack-start recipe", async () => {
    const root = tmpProject({ recipe: "tanstack-start" });
    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    const route = "src/routes/api/puck/$.ts";
    expect(normalizeModule(read(root, route), route)).toBe(
      normalizeModule(readRecipe("tanstack-start-ai", route), route, {
        dropProperties: ["ai"],
      })
    );
    expect(json.cloud).toMatchObject({ configured: true });
  });

  it("matches the react-router-ai recipe's cloud integration on the react-router recipe", async () => {
    const root = tmpProject({ recipe: "react-router" });
    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "app/routes.ts")).toBe(
      readRecipe("react-router-ai", "app/routes.ts")
    );

    const route = "app/routes/api.puck.ts";
    expect(normalizeModule(read(root, route), route)).toBe(
      normalizeModule(readRecipe("react-router-ai", route), route, {
        dropProperties: ["ai"],
      })
    );

    expect(
      json.warnings.find((w) => w.code === "PUCK-CLI-W-DEPLOY-ENV")?.message
    ).toMatch(/react-router-serve/);
    // The react-router recipe doesn't ignore env files
    expect(read(root, ".gitignore")).toContain(
      "\n# Puck Cloud API key\n.env.local\n"
    );
    expect(
      json.plan?.steps.find((s) => s.kind === "modify_file")?.edits
    ).toEqual([
      { line: 6, insert: 'route("api/puck/*", "routes/api.puck.ts")' },
    ]);
  });

  it("is idempotent", async () => {
    const root = tmpProject({ recipe: "react-router" });
    await run(["add", "cloud", "--yes", "--json", "--api-key", KEY], {
      cwd: root,
    });
    const again = await run(["add", "cloud", "--yes", "--json"], { cwd: root });

    expect(again.json).toMatchObject({
      status: "success",
      changed: false,
      plan: { steps: [] },
    });
    expect(again.code).toBe(0);
    expect(again.runner.calls).toEqual([]);
  });

  it("adds the editor first when Puck isn't installed", async () => {
    const root = tmpProject({ recipe: "next" });
    // Strip Puck from a copy of the recipe
    fs.rmSync(path.join(root, "app/puck"), { recursive: true });
    fs.rmSync(path.join(root, "app/[...puckPath]"), { recursive: true });
    const pkg = JSON.parse(read(root, "package.json"));
    delete pkg.dependencies["@puckeditor/core"];
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg));

    const { json, runner } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@^0.23.0",
      "@puckeditor/cloud-client@^0",
    ]);
    const capabilities = json.plan!.steps.map((s) => s.capability);
    expect(capabilities.indexOf("editor")).toBeLessThan(
      capabilities.indexOf("cloud")
    );
    expect(exists(root, "app/puck/[...puckPath]/client.tsx")).toBe(true);
  });

  it("uses PUCK_API_KEY from the environment", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      env: { PUCK_API_KEY: KEY },
    });
    expect(json.status).toBe("success");
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${KEY}\n`);
  });

  it("rejects a key Puck Cloud doesn't recognise without changing anything", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json, code, runner } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", "sk-wrong"],
      { cwd: root }
    );
    expect(json.error?.code).toBe("PUCK-CLI-API-KEY-REJECTED");
    expect(code).toBe(2);
    expect(runner.calls).toEqual([]);
    expect(exists(root, ".env.local")).toBe(false);
  });
});

describe("PUCK_CLOUD_URL", () => {
  const env = { PUCK_CLOUD_URL: "http://localhost:4000/" };
  const host = 'host: "http://localhost:4000/api"';
  const routes = {
    next: "app/api/puck/[...all]/route.ts",
    "react-router": "app/routes/api.puck.ts",
    "tanstack-start": "src/routes/api/puck/$.ts",
  } as const;

  it.each([
    ["next", "cloud"],
    ["next", "ai"],
    ["react-router", "cloud"],
    ["react-router", "ai"],
    ["tanstack-start", "cloud"],
    ["tanstack-start", "ai"],
  ] as const)(
    "points the %s %s route at the configured host",
    async (recipe, capability) => {
      const root = tmpProject({ recipe });
      const { json } = await run(
        ["add", capability, "--yes", "--json", "--api-key", KEY],
        { cwd: root, env }
      );

      expect(json.status).toBe("success");
      const route = routes[recipe];
      const content = read(root, route);
      expect(content).toContain(host);
      expect(
        normalizeModule(content, route, { dropProperties: ["host"] })
      ).toBe(
        normalizeModule(readRecipe(`${recipe}-ai`, route), route, {
          dropProperties: capability === "ai" ? [] : ["ai"],
        })
      );
    }
  );

  it.each(["next", "react-router", "tanstack-start"] as const)(
    "points the route of a scaffolded %s app at the configured host",
    async (framework) => {
      const root = tmpProject("empty");
      const { json } = await run(
        [
          "init",
          "--yes",
          "--json",
          "--ai",
          "--framework",
          framework,
          "--name",
          "site",
          "--api-key",
          KEY,
        ],
        { cwd: root, env }
      );

      expect(json.status).toBe("success");
      expect(json.warnings.map((w) => w.code)).not.toContain(
        "PUCK-CLI-W-AI-ROUTE"
      );
      const route = routes[framework];
      const content = read(path.join(root, "site"), route);
      expect(content).toContain(host);
      expect(
        normalizeModule(content, route, { dropProperties: ["host"] })
      ).toBe(normalizeModule(readRecipe(`${framework}-ai`, route), route));
    }
  );

  it("still upgrades a Cloud route with a host to Puck AI", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(["add", "cloud", "--yes", "--json", "--api-key", KEY], {
      cwd: root,
      env,
    });
    const { json } = await run(
      ["add", "ai", "--yes", "--json", "--api-key", KEY],
      { cwd: root, env }
    );

    expect(json.status).toBe("success");
    expect(json.warnings.map((w) => w.code)).not.toContain(
      "PUCK-CLI-W-AI-ROUTE"
    );
    const route = routes.next;
    expect(read(root, route)).toContain(host);
    expect(
      normalizeModule(read(root, route), route, { dropProperties: ["host"] })
    ).toBe(normalizeModule(readRecipe("next-ai", route), route));
  });
});

describe("env file targeting", () => {
  it("updates a key in .env.development.local in place", async () => {
    const root = tmpProject({ recipe: "next" });
    fs.writeFileSync(
      path.join(root, ".env.development.local"),
      "OTHER=1\nPUCK_API_KEY=sk-stale\n"
    );

    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, ".env.development.local")).toBe(
      `OTHER=1\nPUCK_API_KEY=${KEY}\n`
    );
    expect(exists(root, ".env.local")).toBe(false);
  });

  it("never writes to .env, and warns about keys in it", async () => {
    const root = tmpProject({ recipe: "next" });
    fs.writeFileSync(path.join(root, ".env"), "PUCK_API_KEY=sk-committed\n");

    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(read(root, ".env")).toBe("PUCK_API_KEY=sk-committed\n");
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${KEY}\n`);
    expect(json.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(["PUCK-CLI-W-KEY-IN-SHARED-ENV"])
    );
  });

  it("keeps a valid existing key and asks for a new one when it's rejected", async () => {
    const root = tmpProject({ recipe: "next" });
    fs.writeFileSync(path.join(root, ".env.local"), `PUCK_API_KEY=${KEY}\n`);

    const valid = await run(["add", "cloud", "--yes", "--json"], { cwd: root });
    expect(valid.json.status).toBe("success");
    expect(valid.json.plan?.steps.some((s) => s.kind === "write_env")).toBe(
      false
    );

    const root2 = tmpProject({ recipe: "next" });
    fs.writeFileSync(
      path.join(root2, ".env.local"),
      "PUCK_API_KEY=sk-revoked\n"
    );
    const rejected = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root2,
    });
    expect(rejected.json.status).toBe("action_required");
    expect(rejected.json.actions[0].type).toBe("browser_login");
    expect(rejected.json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-KEY-REJECTED"
    );
  });

  it("writes into vite's envDir for React Router", async () => {
    const root = tmpProject({ recipe: "react-router" });
    fs.writeFileSync(
      path.join(root, "vite.config.ts"),
      read(root, "vite.config.ts").replace(
        "plugins:",
        'envDir: "config",\n  plugins:'
      )
    );
    fs.mkdirSync(path.join(root, "config"));

    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );
    expect(json.status).toBe("success");
    expect(read(root, "config/.env.local")).toBe(`PUCK_API_KEY=${KEY}\n`);
    expect(read(root, ".gitignore")).toContain("config/.env.local");
  });
});
