import fs from "node:fs";
import path from "node:path";
import {
  exists,
  read,
  readRecipe,
  run,
  tmpProject,
  treeSnapshot,
  FakeCloud,
} from "./helpers/harness";

describe("init", () => {
  it("asks for every missing input at once, without changing anything", async () => {
    const root = tmpProject("empty");
    fs.writeFileSync(path.join(root, "notes.txt"), "not empty");
    const before = treeSnapshot(root);

    const { json, code, runner, cloud } = await run(
      ["init", "--yes", "--json"],
      { cwd: root }
    );

    expect(json.status).toBe("action_required");
    expect(code).toBe(10);
    expect(json.actions.map((a) => a.type)).toEqual([
      "choose_framework",
      "provide_app_name",
      "choose_ai",
    ]);
    expect(json.actions[0]).toMatchObject({
      choices: [
        { value: "next" },
        { value: "react-router" },
        { value: "tanstack-start" },
        { value: "vinext" },
        { value: "vite" },
        { value: "astro" },
        { value: "hono" },
        { value: "express" },
      ],
      rerun: expect.stringContaining(
        "--framework <next|react-router|tanstack-start|vinext|vite|astro|hono|express> --name <name> <--ai|--no-ai>"
      ),
    });
    expect(json.actions[2]).toMatchObject({
      choices: [{ value: "--ai" }, { value: "--no-ai" }],
    });
    expect(treeSnapshot(root)).toEqual(before);
    expect(runner.calls).toEqual([]);
    expect(cloud.networkCalls).toBe(0);
  });

  it.each(["next", "react-router", "tanstack-start", "vinext"] as const)(
    "bootstraps a %s app with Puck Cloud and Puck AI from the AI recipe",
    async (framework) => {
      const root = tmpProject("empty");
      fs.writeFileSync(path.join(root, "README.md"), "workspace");

      const { json, runner } = await run(
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
          "sk-valid-key",
        ],
        { cwd: root }
      );

      expect(json.status).toBe("success");
      const app = path.join(root, "site");

      // One install at the end; cloud-client is folded into the new package.json
      expect(runner.calls).toEqual([
        { command: "npm", args: ["install"], cwd: app },
      ]);
      const pkg = JSON.parse(read(app, "package.json"));
      expect(pkg.name).toBe("site");
      expect(pkg.dependencies["@puckeditor/core"]).toBe("^0.23.0");
      expect(pkg.dependencies["@puckeditor/cloud-client"]).toBe("^0");
      expect(pkg.dependencies["@puckeditor/plugin-ai"]).toBe("^0");
      expect(pkg.devDependencies["eslint-config-custom"]).toBeUndefined();
      expect(json.ai).toEqual({ installed: true, configured: true });
      expect(JSON.stringify(pkg)).not.toContain("workspace:");

      expect(read(app, "puck.config.tsx")).toBe(
        readRecipe(`${framework}-ai`, "puck.config.tsx")
      );
      expect(read(app, ".env.local")).toBe("PUCK_API_KEY=sk-valid-key\n");
      expect(exists(app, ".gitignore")).toBe(true);
      expect(exists(app, "eslint.config.mjs")).toBe(false);
      expect(exists(app, "pnpm-workspace.yaml")).toBe(false);
      expect(
        exists(
          app,
          framework === "react-router"
            ? "app/routes/api.puck.ts"
            : framework === "tanstack-start"
            ? "src/routes/api/puck/$.ts"
            : "app/api/puck/[...all]/route.ts"
        )
      ).toBe(true);

      if (framework === "react-router") {
        expect(read(app, "app/routes.ts")).toBe(
          readRecipe("react-router-ai", "app/routes.ts")
        );
        expect(
          JSON.parse(read(app, "tsconfig.json")).compilerOptions.paths
        ).toEqual({ "~/*": ["./app/*"] });
      }

      expect(json.plan?.steps[0]).toMatchObject({
        kind: "scaffold_app",
        path: "site",
      });
      expect(json.nextSteps).toContain("cd site && npm run dev");
    }
  );

  it.each([
    ["20.19.0", "^7.18.0", ">=20.0.0", true],
    ["22.21.1", "^7.18.0", ">=20.0.0", true],
    ["22.22.0", "^8.4.0", ">=22.22.0", false],
    ["24.1.0", "^8.4.0", ">=22.22.0", false],
  ] as const)(
    "scaffolds React Router for Node %s with %s",
    async (nodeVersion, range, engine, warned) => {
      const root = tmpProject("empty");
      fs.writeFileSync(path.join(root, "README.md"), "workspace");

      const { json } = await run(
        [
          "init",
          "--yes",
          "--json",
          "--no-ai",
          "--framework",
          "react-router",
          "--name",
          "site",
        ],
        { cwd: root, nodeVersion }
      );

      expect(json.status).toBe("success");
      const pkg = JSON.parse(read(path.join(root, "site"), "package.json"));
      for (const name of [
        "react-router",
        "@react-router/node",
        "@react-router/serve",
      ])
        expect(pkg.dependencies[name]).toBe(range);
      expect(pkg.devDependencies["@react-router/dev"]).toBe(range);
      expect(pkg.engines.node).toBe(engine);
      // React Router 7 opts in to 8's behavior, so it doesn't warn about each flag
      const config = read(path.join(root, "site"), "react-router.config.ts");
      expect(config.includes("v8_middleware: true")).toBe(warned);
      expect(config).toMatch(/\} satisfies Config;\n$/);
      expect(
        json.warnings.filter((w) => w.code === "PUCK-CLI-W-NODE-VERSION")
      ).toHaveLength(warned ? 1 : 0);
    }
  );

  it("scaffolds in place into an empty directory, named after it", async () => {
    const root = tmpProject("empty");
    const { json } = await run(
      [
        "init",
        "--yes",
        "--json",
        "--ai",
        "--framework",
        "next",
        "--api-key",
        "sk-valid-key",
      ],
      {
        cwd: root,
      }
    );
    expect(json.status).toBe("success");
    expect(JSON.parse(read(root, "package.json")).name).toBe("project");
  });

  it("allows the builds a new pnpm app needs", async () => {
    const root = tmpProject("empty");
    const args = ["--yes", "--json", "--ai", "--api-key", "sk-valid-key"];

    const { json, runner } = await run(
      [
        "init",
        ...args,
        "--framework",
        "vite",
        "--name",
        "site",
        "--package-manager",
        "pnpm",
      ],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    const app = path.join(root, "site");
    expect(read(app, "pnpm-workspace.yaml")).toContain(
      "allowBuilds:\n  esbuild: true\n"
    );
    expect(runner.calls).toEqual([
      { command: "pnpm", args: ["install", "--no-frozen-lockfile"], cwd: app },
    ]);

    // The settings-only pnpm-workspace.yaml doesn't break later runs
    const before = treeSnapshot(app);
    const again = await run(["init", ...args], { cwd: app });
    expect(again.json).toMatchObject({ status: "success", changed: false });
    expect(treeSnapshot(app)).toEqual(before);
  });

  it("verifies an app that's already fully set up without changing it", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(
      ["init", "--yes", "--json", "--ai", "--api-key", "sk-valid-key"],
      {
        cwd: root,
      }
    );
    const before = treeSnapshot(root);

    const { json, code, runner } = await run(["init", "--yes", "--json"], {
      cwd: root,
    });

    expect(json).toMatchObject({
      status: "success",
      changed: false,
      cloud: { configured: true, verified: "remote" },
    });
    expect(code).toBe(0);
    expect(runner.calls).toEqual([]);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("rejects invalid names and non-empty targets", async () => {
    const root = tmpProject("empty");
    const bad = await run(
      [
        "init",
        "--json",
        "--no-ai",
        "--framework",
        "next",
        "--name",
        "../escape",
      ],
      { cwd: root }
    );
    expect(bad.json.error?.code).toBe("PUCK-CLI-INVALID-APP-NAME");

    fs.mkdirSync(path.join(root, "taken"));
    fs.writeFileSync(path.join(root, "taken", "file"), "x");
    const taken = await run(
      ["init", "--json", "--no-ai", "--framework", "next", "--name", "taken"],
      { cwd: root }
    );
    expect(taken.json.error?.code).toBe("PUCK-CLI-TARGET-DIR-NOT-EMPTY");
    expect(taken.code).toBe(4);
  });

  it("rejects a --framework that contradicts the project", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await run(
      ["init", "--yes", "--json", "--no-ai", "--framework", "react-router"],
      { cwd: root }
    );
    expect(json.error?.code).toBe("PUCK-CLI-FRAMEWORK-MISMATCH");
  });
});

describe("Puck Cloud login (connect flow)", () => {
  it("returns a browser_login action, then completes on re-run after approval", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");

    const first = await run(["init", "--yes", "--json", "--ai"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });

    expect(first.json.status).toBe("action_required");
    expect(first.code).toBe(10);
    expect(first.json.actions[0]).toMatchObject({
      type: "browser_login",
      url: expect.stringContaining("/cli/connect#code="),
      userCode: expect.stringMatching(/^[A-Z]{4}-[A-Z0-9]{4}$/),
      rerun: "npx @puckeditor/cli init --yes --json --ai",
    });
    expect(first.runner.calls).toEqual([]);
    expect(exists(root, "app/api/puck/[...all]/route.ts")).toBe(false);
    expect(cloud.requests[0].body).toMatchObject({
      cliVersion: "0.23.0",
      hostname: "test-host",
      framework: "next",
    });

    // Still pending: same session, no new one
    const pending = await run(["init", "--yes", "--json", "--ai"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(pending.json.actions[0]).toMatchObject({
      type: "browser_login",
      userCode:
        first.json.actions[0].type === "browser_login"
          ? first.json.actions[0].userCode
          : "",
    });
    expect(cloud.sessions.size).toBe(1);

    cloud.approveAll();
    const done = await run(["init", "--yes", "--json", "--ai"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });

    expect(done.json.status).toBe("success");
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${cloud.mintedKey}\n`);
    expect(done.json.cloud).toMatchObject({
      configured: true,
      verified: "remote",
      apiKey: { source: ".env.local" },
    });
    expect(
      fs.readdirSync(path.join(home, ".cache", "puck", "connect"))
    ).toEqual([]);
  });

  it("waits for approval with --wait", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    let polls = 0;
    const original = cloud.fetch;
    cloud.fetch = async (input, init) => {
      if (String(input).endsWith("/token") && ++polls === 2) cloud.approveAll();
      return original(input, init);
    };

    const { json } = await run(["add", "cloud", "--yes", "--json", "--wait"], {
      cwd: root,
      cloud,
    });
    expect(json.status).toBe("success");
    expect(polls).toBe(2);
  });

  it("starts a new session when the stored one expired", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");
    let now = Date.now();

    await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
      now: () => now,
    });
    now += 11 * 60 * 1000;
    const second = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
      now: () => now,
    });

    expect(second.json.actions[0].type).toBe("browser_login");
    expect(cloud.sessions.size).toBe(2);
  });

  it("fails clearly when the developer denies access", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");
    await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    for (const s of cloud.sessions.values()) s.status = "denied";

    const { json, code } = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(json.error?.code).toBe("PUCK-CLI-CONNECT-FAILED");
    expect(code).toBe(7);
  });

  it("reports minting failures and keeps the session for a retry", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");
    await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    cloud.approveAll();

    const original = cloud.fetch;
    cloud.fetch = async (input, init) =>
      String(input).endsWith("/token")
        ? new Response(JSON.stringify({ error: "server_error" }), {
            status: 500,
          })
        : original(input, init);
    const failed = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(failed.json.error).toMatchObject({
      code: "PUCK-CLI-CONNECT-FAILED",
      message: expect.stringContaining(
        "couldn't create an API key (500 server_error)"
      ),
    });

    cloud.fetch = original;
    const retried = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(retried.json.status).toBe("success");
  });

  it("falls back to asking for an API key when Puck Cloud is unreachable", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    cloud.offline = true;
    const { json, code } = await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
    });
    expect(code).toBe(10);
    expect(json.actions[0]).toMatchObject({
      type: "provide_api_key",
      flag: "--api-key",
      env: "PUCK_API_KEY",
    });
  });
});
