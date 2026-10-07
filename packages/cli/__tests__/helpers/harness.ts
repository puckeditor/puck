import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CliDeps } from "../../src/deps";
import type { CommandRunner, RunResult } from "../../src/io/runner";
import type { CommandResult } from "../../src/result";
import type { Prompter } from "../../src/io/prompter";
import { runCli } from "../../src/cli";
import { DirTemplateSource } from "../../src/templates/source";
import type { DocsSource } from "../../src/docs/source";
import { DirDocsSource } from "../../src/docs/source";
import { nonInteractivePrompter } from "../../src/io/prompter";
import templatesConfig from "../../templates.json";

export const REPO_ROOT = path.resolve(__dirname, "../../../..");
export const RECIPES = path.join(REPO_ROOT, "recipes");
export const CLI_VERSION = "0.23.0";

export const testTemplates = new DirTemplateSource(RECIPES, {
  gitignoreName: ".gitignore",
  manifest: () => {
    const deps = JSON.parse(
      fs.readFileSync(path.join(RECIPES, "next-ai", "package.json"), "utf8")
    ).dependencies;
    return {
      cloudClientRange: deps["@puckeditor/cloud-client"],
      pluginAiRange: deps["@puckeditor/plugin-ai"],
      cloudClientPagesRange: templatesConfig.ranges.cloudClientPages,
      pluginPagesRange: templatesConfig.ranges.pluginPages,
      pluginAuthRange: templatesConfig.ranges.pluginAuth,
    };
  },
});

/** A small, hand-written stand-in for the docs exported from apps/docs */
export const testDocs = new DirDocsSource(
  path.join(__dirname, "..", "fixtures", "docs")
);

export const readRecipe = (recipe: string, file: string) =>
  fs.readFileSync(path.join(RECIPES, recipe, file), "utf8");

const COPY_SKIP = new Set([
  "node_modules",
  ".next",
  ".react-router",
  ".turbo",
  "build",
]);

const copyDir = (from: string, to: string) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (COPY_SKIP.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
};

export type Tree = Record<string, string>;

export const writeTree = (dir: string, tree: Tree) => {
  for (const [rel, content] of Object.entries(tree)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
};

const tmpRoots: string[] = [];

/** A fresh temporary directory, cleaned up after the test file */
export const tmpDir = () => {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "puck-cli-"))
  );
  tmpRoots.push(dir);
  return dir;
};

afterAll(() => {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true });
});

/** Copies a recipe (or writes a tree) into a temporary project */
export const tmpProject = (
  source: { recipe: string } | { tree: Tree } | "empty"
) => {
  const root = tmpDir();
  const project = path.join(root, "project");
  fs.mkdirSync(project);
  if (source === "empty") return project;
  if ("recipe" in source) copyDir(path.join(RECIPES, source.recipe), project);
  else writeTree(project, source.tree);
  return project;
};

/** Hash of every file below `dir`, to prove read-only commands don't mutate */
export const treeSnapshot = (dir: string) => {
  const out: Record<string, string> = {};
  const visit = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) visit(full);
      else out[path.relative(dir, full)] = fs.readFileSync(full, "utf8");
    }
  };
  visit(dir);
  return out;
};

export interface RunnerCall {
  command: string;
  args: string[];
  cwd: string;
}

/**
 * Records package manager invocations and simulates `add` by writing the
 * dependency into the package.json the real command would have changed.
 */
export class FakeRunner implements CommandRunner {
  calls: RunnerCall[] = [];
  fail: RunResult | null = null;

  async run(
    command: string,
    args: string[],
    { cwd }: { cwd: string }
  ): Promise<RunResult> {
    this.calls.push({ command, args, cwd });
    if (this.fail) return this.fail;

    const specs = args.filter((a) => /^@?[a-z0-9-]+(\/[a-z0-9-]+)?@/.test(a));
    if (specs.length) {
      const pkgFile = this.#targetPackageJson(command, args, cwd);
      const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
      pkg.dependencies = pkg.dependencies ?? {};
      for (const spec of specs) {
        const at = spec.lastIndexOf("@");
        pkg.dependencies[spec.slice(0, at)] = spec.slice(at + 1);
      }
      fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
    }
    return { code: 0, stdout: "", stderr: "" };
  }

  #targetPackageJson(command: string, args: string[], cwd: string) {
    const findByName = (name: string) => {
      const dirs = [
        cwd,
        ...["apps", "packages"].flatMap((d) => {
          const full = path.join(cwd, d);
          return fs.existsSync(full)
            ? fs.readdirSync(full).map((n) => path.join(full, n))
            : [];
        }),
      ];
      const dir = dirs.find((d) => {
        try {
          return (
            JSON.parse(fs.readFileSync(path.join(d, "package.json"), "utf8"))
              .name === name
          );
        } catch {
          return false;
        }
      });
      if (!dir) throw new Error(`FakeRunner: no package named ${name}`);
      return path.join(dir, "package.json");
    };

    if (command === "pnpm" && args[0] === "--filter")
      return findByName(args[1]);
    if (command === "yarn" && args[0] === "workspace")
      return findByName(args[1]);
    const w = args.indexOf("-w");
    if (command === "npm" && w !== -1)
      return path.join(cwd, args[w + 1], "package.json");
    return path.join(cwd, "package.json");
  }
}

/** A stub of the Puck Cloud connect + healthcheck API */
export class FakeCloud {
  validKeys = new Set<string>(["sk-valid-key"]);
  sessions = new Map<
    string,
    { status: "pending" | "approved" | "denied" | "consumed"; userCode: string }
  >();
  requests: {
    method: string;
    path: string;
    body?: unknown;
    headers: Record<string, string>;
  }[] = [];
  mintedKey = "sk-minted-SENTINEL-4242";
  counter = 0;
  offline = false;
  telemetryResponse: "ok" | "error" | "hang" = "ok";
  /** Routes with a page in Puck Cloud */
  pageRoutes = new Set<string>();
  /** Fails this page import request (1-based) with a server error */
  failImportAt?: number;
  imports = 0;

  approveAll() {
    for (const session of this.sessions.values())
      if (session.status === "pending") session.status = "approved";
  }

  fetch: typeof fetch = async (input, init) => {
    if (this.offline) throw new TypeError("fetch failed");
    const url = new URL(String(input));
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    this.requests.push({
      method: init?.method ?? "GET",
      path: url.pathname,
      body,
      headers,
    });

    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      });

    if (url.pathname === "/api/cli/telemetry" && init?.method === "POST") {
      if (this.telemetryResponse === "hang") {
        return new Promise<Response>((_, reject) =>
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason)
          )
        );
      }
      return this.telemetryResponse === "error"
        ? json(500, {})
        : new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/healthcheck") {
      return this.validKeys.has(headers["x-api-key"])
        ? json(200, { body: "Ok!" })
        : json(404, {});
    }

    if (url.pathname === "/api/cli/connect" && init?.method === "POST") {
      const deviceCode = `device-${++this.counter}`;
      const userCode = `BCDF-GH${String(this.counter).padStart(2, "J")}`;
      this.sessions.set(deviceCode, { status: "pending", userCode });
      return json(200, {
        deviceCode,
        userCode,
        verificationUri: `${url.origin}/cli/connect`,
        verificationUriComplete: `${url.origin}/cli/connect#code=${userCode}`,
        expiresIn: 600,
        interval: 5,
      });
    }

    if (url.pathname === "/api/cli/connect/token" && init?.method === "POST") {
      const session = this.sessions.get(
        (body as { deviceCode: string }).deviceCode
      );
      if (!session || session.status === "consumed")
        return json(400, { error: "invalid_grant" });
      if (session.status === "denied")
        return json(400, { error: "access_denied" });
      if (session.status === "pending")
        return json(400, { error: "authorization_pending" });
      session.status = "consumed";
      this.validKeys.add(this.mintedKey);
      return json(200, {
        apiKey: this.mintedKey,
        keyId: "key_1",
        keyName: "Puck CLI · project · test-host",
        organization: { id: "org_1", name: "Acme" },
      });
    }

    if (url.pathname === "/api/pages/batch" && init?.method === "POST") {
      if (!this.validKeys.has(headers["x-api-key"]))
        return json(401, { error: "Unauthorized" });
      if (++this.imports === this.failImportAt)
        return json(500, { error: "Internal server error" });
      const routes = Object.keys((body as { pages: object }).pages);
      const created = routes.filter((r) => !this.pageRoutes.has(r));
      created.forEach((r) => this.pageRoutes.add(r));
      return json(200, {
        status: "ok",
        created,
        skipped: routes.filter((r) => !created.includes(r)),
      });
    }

    return json(404, {});
  };

  /** Bodies posted to /api/cli/telemetry */
  get telemetry() {
    return this.requests
      .filter((r) => r.path === "/api/cli/telemetry")
      .map((r) => r.body as { anonymousId: string; events: unknown[] });
  }

  get networkCalls() {
    return this.requests.length;
  }
}

export interface RunOptions {
  cwd: string;
  env?: Record<string, string | undefined>;
  runner?: FakeRunner;
  cloud?: FakeCloud;
  interactive?: boolean;
  prompter?: Prompter;
  now?: () => number;
  docs?: DocsSource;
  nodeVersion?: string;
}

export interface RunOutput {
  code: number;
  stdout: string;
  stderr: string;
  json: CommandResult;
  runner: FakeRunner;
  cloud: FakeCloud;
  opened: string[];
  devServers: { command: string; args: string[]; cwd: string }[];
}

export const cacheDir = tmpDir;

export const run = async (
  argv: string[],
  opts: RunOptions
): Promise<RunOutput> => {
  let stdout = "";
  let stderr = "";
  const runner = opts.runner ?? new FakeRunner();
  const opened: string[] = [];
  const devServers: RunOutput["devServers"] = [];
  const cloud = opts.cloud ?? new FakeCloud();
  const home = opts.env?.HOME ?? path.join(os.tmpdir(), "puck-cli-home");

  const deps: CliDeps = {
    cwd: opts.cwd,
    env: {
      XDG_CACHE_HOME: path.join(home, ".cache"),
      XDG_CONFIG_HOME: path.join(home, ".config"),
      // telemetry.spec.ts opts back in
      PUCK_TELEMETRY_DISABLED: "1",
      ...opts.env,
    },
    stdout: {
      write: (s: string) => (stdout += s),
      isTTY: Boolean(opts.interactive),
    },
    stderr: {
      write: (s: string) => (stderr += s),
      isTTY: Boolean(opts.interactive),
    },
    stdinIsTTY: Boolean(opts.interactive),
    cliVersion: CLI_VERSION,
    runner,
    fetch: cloud.fetch,
    openUrl: async (url) => {
      opened.push(url);
      return true;
    },
    runDevServer: async (spec, onReady) => {
      devServers.push(spec);
      onReady("http://localhost:3001");
      return 0;
    },
    createPrompter: () => opts.prompter ?? nonInteractivePrompter,
    templates: testTemplates,
    docs: opts.docs ?? testDocs,
    homedir: home,
    hostname: "test-host",
    platform: "linux",
    arch: "x64",
    nodeVersion: opts.nodeVersion ?? "20.19.0",
    now: opts.now ?? (() => Date.now()),
    sleep: async () => undefined,
  };

  const code = await runCli(argv, deps);
  let json = {} as CommandResult;
  if (argv.includes("--json")) {
    expect(stdout).not.toMatch(/\u001b\[/);
    json = JSON.parse(stdout);
  }
  return { code, stdout, stderr, json, runner, cloud, opened, devServers };
};

export const read = (root: string, rel: string) =>
  fs.readFileSync(path.join(root, rel), "utf8");
export const exists = (root: string, rel: string) =>
  fs.existsSync(path.join(root, rel));
