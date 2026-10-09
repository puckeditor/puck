import fs from "node:fs";
import path from "node:path";
import type { Prompter } from "../src/io/prompter";
import {
  FakeCloud,
  read,
  run,
  tmpProject,
  treeSnapshot,
} from "./helpers/harness";

const KEY = "sk-valid-key";

/** A project with Puck Cloud set up and a working key */
const connectedProject = () => {
  const root = tmpProject({ recipe: "next-ai" });
  fs.writeFileSync(path.join(root, ".env.local"), `PUCK_API_KEY=${KEY}\n`);
  return root;
};

describe("connect", () => {
  it("logs in again and replaces a working key", async () => {
    const root = connectedProject();
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");

    const first = await run(["connect", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(first.code).toBe(10);
    expect(first.json.actions[0]).toMatchObject({
      type: "browser_login",
      rerun: "npx @puckeditor/cli connect --yes --json",
    });
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${KEY}\n`);

    cloud.approveAll();
    const done = await run(["connect", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });

    expect(done.code).toBe(0);
    expect(done.json).toMatchObject({
      command: "connect",
      status: "success",
      changed: true,
      message: "Connected to Puck Cloud. Saved PUCK_API_KEY to .env.local.",
      cloud: {
        configured: true,
        verified: "remote",
        apiKey: { present: true, source: ".env.local" },
      },
      filesModified: [".env.local"],
    });
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${cloud.mintedKey}\n`);
    expect(done.json.nextSteps).toEqual([
      "# Restart the dev server so it picks up the new key",
      "npm run dev",
    ]);
    expect(done.json.warnings).toEqual([]);
  });

  it("asks for a key for a branch", async () => {
    const root = connectedProject();
    const cloud = new FakeCloud();
    const home = path.join(root, "..", "home");

    const first = await run(["connect", "preview", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    expect(first.json.actions[0]).toMatchObject({
      type: "browser_login",
      rerun: "npx @puckeditor/cli connect preview --yes --json",
    });
    const started = cloud.requests.filter((r) => r.path === "/api/cli/connect");
    expect(started[0].body).toMatchObject({ branch: "preview" });

    // A pending login for another branch isn't reused
    await run(["connect", "--yes", "--json"], {
      cwd: root,
      cloud,
      env: { HOME: home },
    });
    const restarted = cloud.requests.filter(
      (r) => r.path === "/api/cli/connect"
    );
    expect(restarted).toHaveLength(2);
    expect(restarted[1].body).not.toHaveProperty("branch");
  });

  it.each([["../oops"], ["preview", "extra"]])(
    "rejects connect with %s",
    async (...args: string[]) => {
      const { json, code, cloud } = await run(
        ["connect", ...args, "--yes", "--json"],
        { cwd: connectedProject() }
      );
      expect(code).toBe(2);
      expect(json.error?.code).toBe("PUCK-CLI-INVALID-ARGS");
      expect(cloud.networkCalls).toBe(0);
    }
  );

  it("asks for --yes before logging in", async () => {
    const root = connectedProject();
    const before = treeSnapshot(root);

    const { json, code, cloud } = await run(["connect", "--json"], {
      cwd: root,
    });

    expect(code).toBe(10);
    expect(json.actions[0]).toMatchObject({
      type: "confirm_plan",
      rerun: "npx @puckeditor/cli connect --json --yes",
    });
    expect(cloud.networkCalls).toBe(0);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("writes a key given with --api-key without logging in", async () => {
    const root = connectedProject();
    const cloud = new FakeCloud();
    cloud.validKeys.add("sk-other-key");

    const { json } = await run(
      ["connect", "--yes", "--json", "--api-key", "sk-other-key"],
      { cwd: root, cloud }
    );

    expect(json.status).toBe("success");
    expect(read(root, ".env.local")).toBe("PUCK_API_KEY=sk-other-key\n");
    expect(cloud.requests.map((r) => r.path)).toEqual(["/api/healthcheck"]);
  });

  it("writes the key but points to add cloud when Cloud isn't set up", async () => {
    const root = tmpProject({ recipe: "next" });

    const { json } = await run(
      ["connect", "--yes", "--json", "--api-key", KEY],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${KEY}\n`);
    expect(fs.existsSync(path.join(root, "app/api/puck"))).toBe(false);
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-CLOUD-NOT-SET-UP"
    );
    expect(json.nextSteps).toEqual(["npx @puckeditor/cli add cloud"]);
  });

  it("warns when the environment's key would shadow the new one", async () => {
    const root = connectedProject();

    const { json } = await run(["connect", "--yes", "--json"], {
      cwd: root,
      env: { PUCK_API_KEY: KEY },
    });

    expect(json.actions[0].type).toBe("browser_login");
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-KEY-IN-PROCESS-ENV"
    );
  });

  it("changes nothing with --dry-run", async () => {
    const root = connectedProject();
    const before = treeSnapshot(root);

    const { json, cloud } = await run(["connect", "--dry-run", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(json.dryRun).toBe(true);
    expect(cloud.networkCalls).toBe(0);
    expect(treeSnapshot(root)).toEqual(before);
  });

  it("logs in through the browser when interactive", async () => {
    const root = connectedProject();
    const cloud = new FakeCloud();
    const original = cloud.fetch;
    cloud.fetch = async (input, init) => {
      if (String(input).endsWith("/token")) cloud.approveAll();
      return original(input, init);
    };
    const asked: string[] = [];
    const prompter: Prompter = {
      confirm: () => Promise.reject(new Error("Unexpected confirm")),
      select: (m) => {
        asked.push(m);
        return Promise.resolve("login" as never);
      },
      input: () => Promise.reject(new Error("Unexpected input")),
      password: () => Promise.reject(new Error("Unexpected password")),
    };

    const { code, opened } = await run(["connect"], {
      cwd: root,
      cloud,
      interactive: true,
      prompter,
    });

    expect(code).toBe(0);
    expect(asked).toEqual(["How do you want to connect to Puck Cloud?"]);
    expect(opened[0]).toContain("/cli/connect#code=");
    expect(read(root, ".env.local")).toBe(`PUCK_API_KEY=${cloud.mintedKey}\n`);
  });

  it("is listed in help", async () => {
    const { stdout } = await run([], { cwd: tmpProject("empty") });
    expect(stdout).toMatch(
      /^  connect \[branch\] +Log in to Puck Cloud again/m
    );
  });
});
