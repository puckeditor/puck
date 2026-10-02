import fs from "node:fs";
import path from "node:path";
import { FakeCloud, run, tmpProject } from "./helpers/harness";

const KEY = "sk-valid-key";

/** Telemetry is off in every other spec; these runs opt back in */
const setup = () => {
  const root = tmpProject({ recipe: "next-ai" });
  const home = path.join(root, "..", "home");
  const env = { HOME: home, PUCK_TELEMETRY_DISABLED: undefined };
  const configFile = path.join(home, ".config", "puck", "telemetry.json");
  return { root, home, env, configFile, cloud: new FakeCloud() };
};

describe("telemetry", () => {
  it("sends one anonymous event per command", async () => {
    const { root, env, cloud, configFile } = setup();

    const { code } = await run(["status", "--json"], { cwd: root, cloud, env });

    expect(code).toBe(0);
    expect(cloud.telemetry).toHaveLength(1);
    const [{ anonymousId, events }] = cloud.telemetry;
    expect(anonymousId).toMatch(/^[0-9a-f-]{36}$/);
    expect(events).toEqual([
      {
        event: "cli_command",
        timestamp: expect.any(String),
        command: "status",
        capabilities: [],
        status: "success",
        errorCode: null,
        exitCode: 0,
        durationMs: expect.any(Number),
        dryRun: false,
        changed: false,
        actions: [],
        warnings: [],
        cliVersion: "0.23.0",
        os: "linux",
        arch: "x64",
        nodeVersion: "20.19.0",
        packageManager: expect.any(String),
        ci: false,
        interactive: false,
        json: true,
        agent: null,
        framework: "next",
        // Read from node_modules, which recipes don't have
        frameworkMajor: null,
        monorepo: false,
        puck: true,
        cloud: true,
        ai: true,
        backend: null,
      },
    ]);

    const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
    expect(config.anonymousId).toBe(anonymousId);
    expect(fs.statSync(configFile).mode & 0o777).toBe(0o600);
  });

  it("reuses the anonymous ID across runs", async () => {
    const { root, env, cloud } = setup();

    await run(["status", "--json"], { cwd: root, cloud, env });
    await run(["doctor", "--json", "--offline"], { cwd: root, cloud, env });

    const [first, second] = cloud.telemetry;
    expect(second.anonymousId).toBe(first.anonymousId);
  });

  it("never sends paths, names, hostnames or keys", async () => {
    const { root, env, cloud } = setup();
    fs.writeFileSync(path.join(root, ".env.local"), `PUCK_API_KEY=${KEY}\n`);

    await run(["add", "cloud", "--yes", "--json", "--api-key", KEY], {
      cwd: root,
      cloud,
      env,
    });

    const sent = JSON.stringify(cloud.telemetry);
    expect(sent).toContain('"command":"add"');
    expect(sent).toContain('"capabilities":["cloud"]');
    expect(sent).not.toContain(root);
    expect(sent).not.toContain(path.basename(root));
    expect(sent).not.toContain(KEY);
    expect(sent).not.toContain("test-host");
  });

  it("records arguments that don't parse without sending them", async () => {
    const { root, env, cloud } = setup();

    const { code } = await run(["status", "--json", "--bogus=secret"], {
      cwd: root,
      cloud,
      env,
    });

    expect(code).toBe(2);
    expect(cloud.telemetry[0].events[0]).toMatchObject({
      command: null,
      status: "error",
      errorCode: "PUCK-CLI-INVALID-ARGS",
      exitCode: 2,
    });
    expect(JSON.stringify(cloud.telemetry)).not.toContain("bogus");
  });

  it.each([["PUCK_TELEMETRY_DISABLED"], ["DO_NOT_TRACK"]])(
    "sends nothing and writes nothing with %s=1",
    async (name) => {
      const { root, env, cloud, configFile } = setup();

      await run(["status", "--json"], {
        cwd: root,
        cloud,
        env: { ...env, [name]: "1" },
      });

      expect(cloud.telemetry).toEqual([]);
      expect(fs.existsSync(configFile)).toBe(false);
    }
  );

  it("sends to a local Puck Cloud", async () => {
    const { root, env, cloud } = setup();

    await run(["status", "--json"], {
      cwd: root,
      cloud,
      env: { ...env, PUCK_CLOUD_URL: "http://localhost:3000" },
    });

    expect(cloud.telemetry).toHaveLength(1);
  });

  it("prints events instead of sending them with PUCK_TELEMETRY_DEBUG", async () => {
    const { root, env, cloud } = setup();

    const { stderr } = await run(["status", "--json"], {
      cwd: root,
      cloud,
      env: { ...env, PUCK_TELEMETRY_DEBUG: "1" },
    });

    expect(cloud.telemetry).toEqual([]);
    expect(stderr).toMatch(/^\[telemetry\] \{"anonymousId":/m);
  });

  it("detects coding agents by name only", async () => {
    const { root, env, cloud } = setup();

    await run(["status", "--json"], {
      cwd: root,
      cloud,
      env: { ...env, CLAUDECODE: "1" },
    });

    expect(cloud.telemetry[0].events[0]).toMatchObject({
      agent: "claude-code",
    });
  });

  it.each([["error"], ["hang"]] as const)(
    "doesn't change the result when the endpoint fails (%s)",
    async (mode) => {
      const { root, env } = setup();
      const baseline = await run(["status", "--json"], {
        cwd: root,
        env: { HOME: env.HOME },
      });

      const cloud = new FakeCloud();
      cloud.telemetryResponse = mode;
      const started = Date.now();
      const failing = await run(["status", "--json"], {
        cwd: root,
        cloud,
        env,
      });

      expect(Date.now() - started).toBeLessThan(5_000);
      expect(failing.code).toBe(baseline.code);
      expect(failing.stdout).toBe(baseline.stdout);
      expect(cloud.telemetry).toHaveLength(1);
    }
  );

  it("tells humans about telemetry once", async () => {
    const { root, env, cloud } = setup();

    const agent = await run(["status", "--json"], { cwd: root, cloud, env });
    const first = await run(["status"], { cwd: root, cloud, env });
    const second = await run(["status"], { cwd: root, cloud, env });

    expect(agent.stderr).not.toContain("anonymous usage data");
    expect(first.stderr).toContain("Puck CLI collects anonymous usage data");
    expect(first.stdout).not.toContain("anonymous usage data");
    expect(second.stderr).not.toContain("anonymous usage data");
  });

  it("doesn't show the notice when telemetry is off", async () => {
    const { root, env, cloud } = setup();

    const { stderr } = await run(["status"], {
      cwd: root,
      cloud,
      env: { ...env, DO_NOT_TRACK: "1" },
    });

    expect(stderr).not.toContain("anonymous usage data");
  });

  it("turns off for the run when the config can't be written", async () => {
    const { root, env, cloud, home } = setup();
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(path.join(home, ".config"), "not a directory");

    const { code } = await run(["status", "--json"], { cwd: root, cloud, env });

    expect(code).toBe(0);
    expect(cloud.telemetry).toEqual([]);
  });

  describe("telemetry command", () => {
    it("shows the status without sending or creating anything", async () => {
      const { root, env, cloud, configFile } = setup();

      const { code, json } = await run(["telemetry", "--json"], {
        cwd: root,
        cloud,
        env,
      });

      expect(code).toBe(0);
      expect(json).toMatchObject({
        command: "telemetry",
        status: "success",
        changed: false,
        telemetry: { enabled: true, reason: "default", anonymousId: null },
      });
      expect(cloud.networkCalls).toBe(0);
      expect(fs.existsSync(configFile)).toBe(false);
    });

    it("disables telemetry and forgets the anonymous ID", async () => {
      const { root, env, cloud, configFile } = setup();
      await run(["status", "--json"], { cwd: root, cloud, env });
      expect(cloud.telemetry).toHaveLength(1);

      const disabled = await run(["telemetry", "disable", "--json"], {
        cwd: root,
        cloud,
        env,
      });
      await run(["status", "--json"], { cwd: root, cloud, env });
      await run(["telemetry", "disable", "--bogus"], { cwd: root, cloud, env });

      expect(disabled.json).toMatchObject({
        changed: true,
        message: "Telemetry is off.",
        telemetry: { enabled: false, reason: "disabled", anonymousId: null },
      });
      expect(cloud.telemetry).toHaveLength(1);
      expect(JSON.parse(fs.readFileSync(configFile, "utf8"))).toEqual({
        enabled: false,
      });
    });

    it("re-enables telemetry with a new anonymous ID", async () => {
      const { root, env, cloud } = setup();
      await run(["status", "--json"], { cwd: root, cloud, env });
      await run(["telemetry", "disable"], { cwd: root, cloud, env });

      const enabled = await run(["telemetry", "enable", "--json"], {
        cwd: root,
        cloud,
        env,
      });
      await run(["status", "--json"], { cwd: root, cloud, env });

      expect(enabled.json.telemetry).toMatchObject({
        enabled: true,
        reason: "enabled",
      });
      const [before, after] = cloud.telemetry;
      expect(after.anonymousId).not.toBe(before.anonymousId);
    });

    it("explains when the environment keeps telemetry off", async () => {
      const { root, env, cloud } = setup();

      const { json } = await run(["telemetry", "enable", "--json"], {
        cwd: root,
        cloud,
        env: { ...env, DO_NOT_TRACK: "1" },
      });

      expect(json.telemetry).toMatchObject({
        enabled: false,
        reason: "DO_NOT_TRACK",
      });
      expect(json.message).toMatch(/but stays off: DO_NOT_TRACK is set\.$/);
    });

    it("rejects unknown subcommands", async () => {
      const { root, env, cloud } = setup();

      const { code, json } = await run(["telemetry", "off", "--json"], {
        cwd: root,
        cloud,
        env,
      });

      expect(code).toBe(2);
      expect(json.error?.code).toBe("PUCK-CLI-INVALID-ARGS");
      expect(cloud.networkCalls).toBe(0);
    });
  });

  describe("connect", () => {
    const startBody = (cloud: FakeCloud) =>
      cloud.requests.find((r) => r.path === "/api/cli/connect")?.body;

    it("sends the anonymous ID so Puck Cloud can link the account", async () => {
      const { root, env, cloud } = setup();

      await run(["connect", "--yes", "--json"], { cwd: root, cloud, env });

      expect(startBody(cloud)).toMatchObject({
        anonymousId: cloud.telemetry[0].anonymousId,
      });
    });

    it("leaves it out when telemetry is off", async () => {
      const { root, env, cloud } = setup();

      await run(["connect", "--yes", "--json"], {
        cwd: root,
        cloud,
        env: { ...env, DO_NOT_TRACK: "1" },
      });

      expect(startBody(cloud)).not.toHaveProperty("anonymousId");
    });
  });
});
