import { run, tmpProject, treeSnapshot, FakeCloud } from "./helpers/harness";
import { nextMinimal, nextPages } from "./helpers/fixtures";

const checks = (findings: { check: string; status: string }[] = []) =>
  Object.fromEntries(findings.map((f) => [f.check, f.status]));

describe("status", () => {
  it("reports an app without Puck", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const { json, code } = await run(["status", "--json"], { cwd: root });
    expect(code).toBe(0);
    expect(json).toMatchObject({
      message: "Puck isn't set up yet.",
      project: { framework: "next", packageManager: "npm", typescript: true },
      puck: { installed: false, configured: false },
      cloud: { configured: false },
      nextSteps: ["npx @puckeditor/cli init"],
    });
  });

  it("suggests init when there's no project", async () => {
    const { json } = await run(["status", "--json"], {
      cwd: tmpProject("empty"),
    });
    expect(json.nextSteps).toEqual(["npx @puckeditor/cli init"]);
  });

  it("prints a human-readable table", async () => {
    const root = tmpProject({ recipe: "react-router" });
    const { stdout } = await run(["status"], { cwd: root });
    expect(stdout).toContain("Framework        React Router");
    expect(stdout).toContain("Puck Editor      configured");
  });
});

describe("doctor", () => {
  it("suggests the next command without changing anything", async () => {
    const root = tmpProject({ recipe: "next" });
    const before = treeSnapshot(root);
    const { json, code } = await run(["doctor", "--json"], { cwd: root });

    expect(code).toBe(6);
    expect(checks(json.findings)).toMatchObject({
      "project.framework": "ok",
      "puck.core_installed": "ok",
      "puck.editor": "ok",
      "cloud.client_installed": "fail",
      "cloud.api_key": "fail",
      "cloud.connection": "skip",
    });
    expect(json.nextSteps).toContain("npx @puckeditor/cli add cloud");
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("checks the key against Puck Cloud", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(
      ["add", "cloud", "--yes", "--json", "--api-key", "sk-valid-key"],
      { cwd: root }
    );

    const healthy = await run(["doctor", "--json"], { cwd: root });
    expect(healthy.code).toBe(0);
    expect(checks(healthy.json.findings)["cloud.connection"]).toBe("ok");
    expect(healthy.json.cloud?.verified).toBe("remote");

    const cloud = new FakeCloud();
    cloud.validKeys.clear();
    const revoked = await run(["doctor", "--json"], { cwd: root, cloud });
    expect(checks(revoked.json.findings)["cloud.connection"]).toBe("fail");

    const offline = await run(["doctor", "--json", "--offline"], { cwd: root });
    expect(checks(offline.json.findings)["cloud.connection"]).toBe("skip");
    expect(offline.cloud.networkCalls).toBe(0);
  });

  it("explains unsupported projects", async () => {
    const { json } = await run(["doctor", "--json"], {
      cwd: tmpProject({ tree: nextPages() }),
    });
    expect(
      json.findings?.find((f) => f.check === "project.framework")
    ).toMatchObject({
      status: "fail",
      evidence: expect.stringContaining("Pages Router"),
    });
  });
});

describe("arguments", () => {
  it.each([
    [["frobnicate", "--json"], "PUCK-CLI-UNKNOWN-COMMAND"],
    [["init", "--json", "--bogus"], "PUCK-CLI-INVALID-ARGS"],
    [["status", "--json", "--api-key", "x"], "PUCK-CLI-INVALID-ARGS"],
    [["add", "--json"], "PUCK-CLI-INVALID-ARGS"],
    [["add", "views", "--json"], "PUCK-CLI-UNKNOWN-CAPABILITY"],
    [["init", "--json", "--framework", "vue"], "PUCK-CLI-INVALID-ARGS"],
    [["init", "--json", "--ai", "--no-ai"], "PUCK-CLI-INVALID-ARGS"],
    [["init", "--json", "--no-cloud"], "PUCK-CLI-INVALID-ARGS"],
    [["add", "ai", "--json", "--ai"], "PUCK-CLI-INVALID-ARGS"],
    [
      ["status", "--json", "--cwd", "/definitely/missing"],
      "PUCK-CLI-CWD-NOT-FOUND",
    ],
    [["docs", "bogus", "--json"], "PUCK-CLI-INVALID-ARGS"],
    [["docs", "cat", "--json"], "PUCK-CLI-INVALID-ARGS"],
    [["docs", "find", "--json"], "PUCK-CLI-INVALID-ARGS"],
    [["docs", "cat", "nope", "--json"], "PUCK-CLI-DOC-NOT-FOUND"],
    [["docs", "--json", "--cwd", "."], "PUCK-CLI-INVALID-ARGS"],
  ])("%j → %s", async (argv, errorCode) => {
    const { json, code } = await run(argv, { cwd: tmpProject("empty") });
    expect(json.status).toBe("error");
    expect(json.error?.code).toBe(errorCode);
    expect(code).toBe(2);
  });

  it("prints the agent guide with no arguments", async () => {
    const { stdout, code } = await run([], { cwd: tmpProject("empty") });
    expect(code).toBe(0);
    expect(stdout).toContain(
      "Run this first:\n  npx @puckeditor/cli status --json"
    );
  });

  it("prints the version", async () => {
    const { stdout } = await run(["--version"], { cwd: tmpProject("empty") });
    expect(stdout).toBe("0.23.0\n");
  });
});
