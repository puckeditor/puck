import fs from "node:fs";
import path from "node:path";
import { exists, read, run, tmpProject, treeSnapshot } from "./helpers/harness";
import {
  emptyPnpmMonorepo,
  packageJsonMonorepo,
  pnpmMonorepo,
} from "./helpers/fixtures";

const KEY = ["--api-key", "sk-valid-key"];

describe("workspaces", () => {
  it("auto-targets the only app from the workspace root", async () => {
    const root = tmpProject({ tree: pnpmMonorepo(["web"]) });
    const { json, runner } = await run(["init", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(runner.calls[0]).toEqual({
      command: "pnpm",
      args: [
        "--filter",
        "web",
        "add",
        "@puckeditor/core@^0.23.0",
        "@puckeditor/cloud-client@^0",
        "@puckeditor/plugin-ai@^0",
      ],
      cwd: root,
    });
    expect(json.project).toMatchObject({
      root: path.join(root, "apps/web"),
      packageManager: "pnpm",
      workspace: {
        root,
        manager: "pnpm",
        target: { name: "web", dir: "apps/web" },
      },
    });
    expect(json.filesCreated).toContain(
      "apps/web/app/api/puck/[...all]/route.ts"
    );
    expect(read(root, "apps/web/.env.local")).toBe(
      "PUCK_API_KEY=sk-valid-key\n"
    );
    expect(exists(root, ".env.local")).toBe(false);
    // The root .gitignore's .env*.local already covers it
    expect(json.plan?.steps.some((s) => s.kind === "update_gitignore")).toBe(
      false
    );
    expect(json.nextSteps[0]).toMatch(/only supported app/);
  });

  it("asks which app to use when there are several", async () => {
    const root = tmpProject({ tree: pnpmMonorepo() });
    const before = treeSnapshot(root);
    const { json, code } = await run(["init", "--yes", "--json", ...KEY], {
      cwd: root,
    });

    expect(code).toBe(10);
    expect(json.actions).toEqual([
      expect.objectContaining({
        type: "choose_workspace_package",
        flag: "--workspace",
        choices: [
          { value: "apps/admin", label: "admin (React Router)" },
          { value: "apps/web", label: "web (Next.js)" },
        ],
      }),
    ]);
    expect(treeSnapshot(root)).toEqual(before);

    const chosen = await run(
      ["init", "--yes", "--json", "--workspace", "apps/admin", ...KEY],
      { cwd: root }
    );
    expect(chosen.json.status).toBe("success");
    expect(read(root, "apps/admin/app/routes.ts")).toContain(
      'route("api/puck/*", "routes/api.puck.ts")'
    );
    expect(chosen.runner.calls[0].args.slice(0, 3)).toEqual([
      "--filter",
      "admin",
      "add",
    ]);
  });

  it("accepts a package name for --workspace and reports unknown targets", async () => {
    const root = tmpProject({ tree: pnpmMonorepo() });
    const byName = await run(
      ["add", "editor", "--dry-run", "--json", "--workspace", "web"],
      { cwd: root }
    );
    expect(byName.json.project?.root).toBe(path.join(root, "apps/web"));

    const unknown = await run(
      ["add", "editor", "--json", "--workspace", "nope"],
      { cwd: root }
    );
    expect(unknown.json.error).toMatchObject({
      code: "PUCK-CLI-WORKSPACE-TARGET-NOT-FOUND",
      details: {
        candidates: expect.arrayContaining([{ name: "web", dir: "apps/web" }]),
      },
    });
  });

  it("scopes installs when run inside a workspace package", async () => {
    const root = tmpProject({ tree: pnpmMonorepo() });
    const { json, runner } = await run(
      ["add", "cloud", "--yes", "--json", ...KEY],
      { cwd: path.join(root, "apps/web") }
    );
    expect(json.status).toBe("success");
    expect(runner.calls[0]).toMatchObject({
      command: "pnpm",
      args: expect.arrayContaining(["--filter", "web"]),
      cwd: root,
    });
    expect(json.filesCreated).toContain(".env.local");
  });

  it.each([
    [
      "package-lock.json",
      {
        command: "npm",
        args: [
          "install",
          "@puckeditor/core@^0.23.0",
          "@puckeditor/cloud-client@^0",
          "@puckeditor/plugin-ai@^0",
          "-w",
          "apps/web",
        ],
      },
    ],
    [
      "yarn.lock",
      {
        command: "yarn",
        args: [
          "workspace",
          "web",
          "add",
          "@puckeditor/core@^0.23.0",
          "@puckeditor/cloud-client@^0",
          "@puckeditor/plugin-ai@^0",
        ],
      },
    ],
    [
      "bun.lock",
      {
        command: "bun",
        args: [
          "add",
          "@puckeditor/core@^0.23.0",
          "@puckeditor/cloud-client@^0",
          "@puckeditor/plugin-ai@^0",
        ],
      },
    ],
  ])("uses %s workspaces", async (lockfile, expected) => {
    const root = tmpProject({ tree: packageJsonMonorepo(lockfile) });
    const { json, runner } = await run(["init", "--yes", "--json", ...KEY], {
      cwd: root,
    });
    expect(json.status).toBe("success");
    expect(runner.calls[0]).toMatchObject({
      ...expected,
      cwd: expected.command === "bun" ? path.join(root, "apps/web") : root,
    });
  });

  it("creates a new app inside an empty workspace", async () => {
    const root = tmpProject({ tree: emptyPnpmMonorepo() });

    const missing = await run(
      ["init", "--yes", "--json", "--framework", "next"],
      { cwd: root }
    );
    expect(missing.json.actions.map((a) => a.type)).toEqual([
      "provide_app_name",
    ]);

    const { json, runner } = await run(
      [
        "init",
        "--yes",
        "--json",
        "--framework",
        "next",
        "--name",
        "site",
        ...KEY,
      ],
      { cwd: root }
    );
    expect(json.status).toBe("success");
    expect(exists(root, "apps/site/app/puck/page.tsx")).toBe(true);
    expect(runner.calls).toEqual([
      { command: "pnpm", args: ["install", "--no-frozen-lockfile"], cwd: root },
    ]);
    expect(json.project?.workspace?.root).toBe(root);
  });

  it("treats workspace:* and catalog: versions of Puck as installed", async () => {
    const tree = pnpmMonorepo(["web"]);
    const pkg = JSON.parse(tree["apps/web/package.json"]);
    pkg.dependencies["@puckeditor/core"] = "catalog:";
    tree["apps/web/package.json"] = JSON.stringify(pkg);
    const root = tmpProject({ tree });
    const { json } = await run(["add", "editor", "--dry-run", "--json"], {
      cwd: root,
    });
    expect(json.plan?.steps.some((s) => s.kind === "install_package")).toBe(
      false
    );
  });

  it("treats a directory outside the workspace globs as standalone", async () => {
    const root = tmpProject({ tree: pnpmMonorepo(["web"]) });
    fs.renameSync(path.join(root, "apps/web"), path.join(root, "tools-web"));
    const { json } = await run(["status", "--json"], {
      cwd: path.join(root, "tools-web"),
    });
    expect(json.project?.workspace).toBeNull();
    expect(json.warnings[0].message).toMatch(/standalone/);
  });

  it("summarises every app from the workspace root", async () => {
    const root = tmpProject({ tree: pnpmMonorepo() });
    const { json } = await run(["status", "--json"], { cwd: root });
    expect(json.project?.workspace?.packages).toEqual([
      {
        name: "admin",
        dir: "apps/admin",
        framework: "react-router",
        puck: false,
        cloud: false,
      },
      {
        name: "web",
        dir: "apps/web",
        framework: "next",
        puck: false,
        cloud: false,
      },
      {
        name: "@mono/ui",
        dir: "packages/ui",
        framework: null,
        puck: false,
        cloud: false,
      },
    ]);
    expect(json.nextSteps).toEqual([
      "npx @puckeditor/cli init --workspace apps/admin",
      "npx @puckeditor/cli init --workspace apps/web",
    ]);
  });
});
