import fs from "node:fs";
import path from "node:path";
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
    expect(
      revoked.json.findings?.find((f) => f.check === "cloud.connection")?.fix
    ).toBe("npx @puckeditor/cli connect");

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

  it("points unknown commands at the npx invocation", async () => {
    const { json } = await run(["frobnicate", "--json"], {
      cwd: tmpProject("empty"),
    });
    expect(json.message).toBe(
      'Unknown command "frobnicate". Run `npx @puckeditor/cli --help` to see available commands.'
    );
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

describe("Puck Pages and Puck Auth", () => {
  const KEY = ["--api-key", "sk-valid-key"];

  it("reports Pages, and suggests Auth until it's added", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(["add", "pages", "--yes", "--json", ...KEY], { cwd: root });

    const pages = await run(["status", "--json"], { cwd: root });
    expect(pages.json.pages).toEqual({ installed: true, configured: true });
    expect(pages.json.auth).toEqual({ installed: false, configured: false });
    expect(pages.json.nextSteps).toContain("npx @puckeditor/cli add auth");

    await run(["add", "auth", "--yes", "--json"], { cwd: root });
    const both = await run(["status", "--json"], { cwd: root });
    expect(both.json.auth).toEqual({ installed: true, configured: true });
    expect(both.json.nextSteps).not.toContain("npx @puckeditor/cli add auth");

    const { stdout } = await run(["status"], { cwd: root });
    expect(stdout).toMatch(/Puck Pages\s+configured/);
    expect(stdout).toMatch(/Puck Auth\s+configured/);
  });

  it("checks them in doctor", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(["add", "pages", "auth", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    const { json } = await run(["doctor", "--json", "--offline"], {
      cwd: root,
    });
    expect(checks(json.findings)).toMatchObject({
      "pages.plugin_configured": "ok",
      "pages.render": "ok",
      "auth.plugin_configured": "ok",
      "auth.route": "ok",
      "cloud.client_version": "ok",
    });
  });

  it("fails doctor when the Cloud route doesn't require Sign in", async () => {
    const root = tmpProject({ recipe: "next" });
    await run(["add", "pages", "auth", "--yes", "--json", ...KEY], {
      cwd: root,
    });
    const route = path.join(root, "app/api/puck/[...all]/route.ts");
    fs.writeFileSync(
      route,
      fs
        .readFileSync(route, "utf8")
        .replace(/import \{ authenticate \}.*\n/, "")
        .replace("{ authenticate }", "{ authenticate: () => ({ id: null }) }")
    );

    const { json } = await run(["doctor", "--json", "--offline"], {
      cwd: root,
    });
    expect(checks(json.findings)["auth.route"]).toBe("fail");
  });
});
