import fs from "node:fs";
import path from "node:path";
import {
  run,
  tmpProject,
  treeSnapshot,
  FakeCloud,
  FakeRunner,
} from "./helpers/harness";
import { nextMinimal } from "./helpers/fixtures";

const SENTINEL = "sk-SENTINEL-do-not-print-9f3a";

describe("--dry-run", () => {
  it.each([
    ["add cloud on a recipe", { recipe: "react-router" }, ["add", "cloud"]],
    ["add editor on a new app", { tree: nextMinimal() }, ["add", "editor"]],
    ["init on a new app", { tree: nextMinimal() }, ["init", "--ai"]],
    [
      "init in an empty dir",
      "empty",
      ["init", "--ai", "--framework", "next", "--name", "x"],
    ],
  ] as const)(
    "%s changes nothing and uses no network",
    async (_, source, args) => {
      const root = tmpProject(source as Parameters<typeof tmpProject>[0]);
      const before = treeSnapshot(root);
      const { json, code, runner, cloud } = await run(
        [...args, "--dry-run", "--json"],
        { cwd: root }
      );

      expect(json).toMatchObject({
        status: "success",
        dryRun: true,
        changed: false,
        filesModified: [],
      });
      expect(json.plan!.steps.length).toBeGreaterThan(0);
      expect(code).toBe(0);
      expect(treeSnapshot(root)).toEqual(before);
      expect(runner.calls).toEqual([]);
      expect(cloud.networkCalls).toBe(0);
    }
  );
});

describe("consent", () => {
  it("never mutates or starts a login without --yes when not interactive", async () => {
    const root = tmpProject({ recipe: "next" });
    const before = treeSnapshot(root);
    const { json, code, cloud } = await run(["init", "--json", "--ai"], {
      cwd: root,
    });

    expect(json.status).toBe("action_required");
    expect(code).toBe(10);
    expect(json.actions[0]).toMatchObject({
      type: "confirm_plan",
      rerun: "npx @puckeditor/cli init --json --ai --yes",
    });
    expect(cloud.networkCalls).toBe(0);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("doesn't start a login to replace a rejected key without --yes", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(
      ["add", "cloud", "--yes", "--json", "--api-key", "sk-valid-key"],
      { cwd: root }
    );
    const cloud = new FakeCloud();
    cloud.validKeys.clear();

    const { json } = await run(["add", "cloud", "--json"], {
      cwd: root,
      cloud,
    });

    expect(json.actions[0].type).toBe("confirm_plan");
    expect(cloud.requests.map((r) => r.path)).toEqual(["/api/healthcheck"]);
  });

  it("never prompts without a TTY, even in human mode", async () => {
    const root = tmpProject({ recipe: "next" });
    // The default prompter throws if called
    const { code, stderr } = await run(["init"], {
      cwd: root,
      env: { CI: "1" },
    });
    expect(code).toBe(10);
    expect(stderr).not.toContain("non-interactive");
  });
});

describe("secrets", () => {
  const expectNoSentinel = (text: string) =>
    expect(text).not.toContain(SENTINEL);

  it("never prints the API key", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    cloud.validKeys.add(SENTINEL);

    for (const args of [["--json"], []]) {
      const out = await run(
        ["add", "cloud", "--yes", "--api-key", SENTINEL, ...args],
        { cwd: root, cloud }
      );
      expectNoSentinel(out.stdout + out.stderr);
    }
    expect(fs.readFileSync(path.join(root, ".env.local"), "utf8")).toContain(
      SENTINEL
    );

    const status = await run(["status", "--json"], { cwd: root });
    const doctor = await run(["doctor", "--json"], { cwd: root, cloud });
    expectNoSentinel(status.stdout + doctor.stdout);
  });

  it("scrubs keys from failing install output", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    cloud.validKeys.add(SENTINEL);
    const out = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", SENTINEL],
      {
        cwd: root,
        cloud,
        runner: Object.assign(new FakeRunner(), {
          fail: { code: 1, stdout: `npm ERR! token ${SENTINEL}`, stderr: "" },
        }),
      }
    );

    expect(out.json.error?.code).toBe("PUCK-CLI-INSTALL-FAILED");
    expect(out.code).toBe(5);
    expect(out.json.error?.details?.output).toContain("[redacted]");
    expectNoSentinel(out.stdout);
    expect(fs.existsSync(path.join(root, ".env.local"))).toBe(false);
  });

  it("never prints keys minted by the connect flow", async () => {
    const root = tmpProject({ recipe: "next" });
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");
    await run(["add", "cloud", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    cloud.approveAll();
    const out = await run(["add", "cloud", "--yes"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(out.stdout + out.stderr).not.toContain(cloud.mintedKey);
  });
});

describe("--no-env-write", () => {
  it("reports what to set instead of writing a file", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json, code } = await run(
      ["add", "cloud", "--yes", "--json", "--no-env-write"],
      { cwd: root }
    );

    expect(json.status).toBe("partial");
    expect(code).toBe(11);
    expect(json.actions).toEqual([
      expect.objectContaining({
        type: "set_environment_variable",
        name: "PUCK_API_KEY",
      }),
    ]);
    expect(fs.existsSync(path.join(root, ".env.local"))).toBe(false);
  });

  it("succeeds when the key is in the process environment", async () => {
    const root = tmpProject({ recipe: "next" });
    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--no-env-write"],
      {
        cwd: root,
        env: { PUCK_API_KEY: "sk-valid-key" },
      }
    );
    expect(json).toMatchObject({
      status: "success",
      cloud: { apiKey: { source: "process.env" } },
    });
    expect(fs.existsSync(path.join(root, ".env.local"))).toBe(false);
  });
});
