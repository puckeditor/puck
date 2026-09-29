import fs from "node:fs";
import path from "node:path";
import type { Tree } from "./helpers/harness";
import type { FrameworkId } from "../src/detect/framework";
import { run, tmpProject } from "./helpers/harness";
import {
  astroMinimal,
  expressMinimal,
  honoMinimal,
  nextMinimal,
  rrMinimal,
  tanstackMinimal,
  viteMinimal,
  vinextMinimal,
} from "./helpers/fixtures";
import {
  FRAMEWORK_IDS,
  FRAMEWORK_LABELS,
  MIN_VERSIONS,
} from "../src/detect/framework";

/** Sets a dependency's range in package.json, wherever it's declared */
const withRange = (tree: Tree, dep: string, range: string): Tree => {
  const pkg = JSON.parse(tree["package.json"]);
  const key =
    dep in (pkg.devDependencies ?? {}) ? "devDependencies" : "dependencies";
  pkg[key] = { ...pkg[key], [dep]: range };
  return { ...tree, "package.json": JSON.stringify(pkg, null, 2) + "\n" };
};

const FRAMEWORKS: [FrameworkId, string, () => Tree, string, string][] = [
  ["next", "next", nextMinimal, "14.2.0", "15.0.0"],
  ["react-router", "@react-router/dev", rrMinimal, "6.28.0", "7.0.0"],
  [
    "tanstack-start",
    "@tanstack/react-start",
    tanstackMinimal,
    "1.131.50",
    "1.132.0",
  ],
  ["vinext", "vinext", vinextMinimal, "0.2.1", "1.0.0-beta.0"],
  ["vite", "vite", viteMinimal, "5.4.0", "6.0.0"],
  ["astro", "astro", astroMinimal, "6.3.0", "7.0.0"],
  ["hono", "hono", honoMinimal, "3.12.0", "4.0.0"],
  ["express", "express", expressMinimal, "4.15.5", "4.16.0"],
];

const detect = (tree: Tree) =>
  run(["add", "editor", "--dry-run", "--json"], {
    cwd: tmpProject({ tree }),
  });

describe("framework versions", () => {
  it("checks every framework", () => {
    expect(FRAMEWORKS.map(([id]) => id).sort()).toEqual(
      [...FRAMEWORK_IDS].sort()
    );
  });

  describe.each(FRAMEWORKS)("%s", (id, dep, fixture, tooOld, oldest) => {
    it(`refuses ${tooOld}`, async () => {
      const { json, code } = await detect(withRange(fixture(), dep, tooOld));
      expect(code).toBe(3);
      expect(json.error).toMatchObject({
        code: "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION",
        message: expect.stringContaining(
          `Upgrade to ${FRAMEWORK_LABELS[id]} ${MIN_VERSIONS[id]} or later`
        ),
        details: { version: tooOld, minVersion: MIN_VERSIONS[id] },
      });
    });

    it(`accepts ${oldest}`, async () => {
      const { json } = await detect(withRange(fixture(), dep, oldest));
      expect(json.error?.code).not.toBe(
        "PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION"
      );
    });
  });

  it("prefers the installed version over the range", async () => {
    const root = tmpProject({
      tree: withRange(honoMinimal(), "hono", "^4.0.0"),
    });
    const installed = path.join(root, "node_modules", "hono");
    fs.mkdirSync(installed, { recursive: true });
    fs.writeFileSync(
      path.join(installed, "package.json"),
      JSON.stringify({ name: "hono", version: "3.12.0" })
    );
    const { json } = await run(["add", "editor", "--dry-run", "--json"], {
      cwd: root,
    });
    expect(json.error?.details).toMatchObject({ version: "3.12.0" });
  });

  it("allows versions it can't read", async () => {
    const { json } = await detect(withRange(honoMinimal(), "hono", "latest"));
    expect(json.error?.code).not.toBe("PUCK-CLI-UNSUPPORTED-FRAMEWORK-VERSION");
  });

  it("explains how to upgrade", async () => {
    const { json } = await detect(
      withRange(tanstackMinimal(), "@tanstack/react-start", "^1.120.0")
    );
    expect(json.error?.message).toBe(
      "TanStack Start ^1.120.0 is not supported. Upgrade to TanStack Start 1.132 or later, or integrate Puck manually."
    );
  });
});

describe("frameworks", () => {
  it("lists every framework", async () => {
    const { json, code } = await run(["frameworks", "--json"], {
      cwd: tmpProject("empty"),
    });
    expect(code).toBe(0);
    expect(json.frameworks?.map((f) => f.id)).toEqual([...FRAMEWORK_IDS]);
    expect(json.frameworks).toContainEqual({
      id: "vite",
      name: "Vite",
      minVersion: "6",
      kind: "app",
      needsServer: true,
      notes: expect.any(String),
    });
    expect(json.frameworks?.find((f) => f.id === "express")).toMatchObject({
      kind: "server",
      needsServer: false,
    });
  });

  it("prints a table", async () => {
    const { stdout } = await run(["frameworks"], { cwd: tmpProject("empty") });
    expect(stdout).toMatch(/^Framework\s+ID\s+Versions\s+Editor/);
    expect(stdout).toMatch(/TanStack Start\s+tanstack-start\s+1\.132\+/);
    expect(stdout).toMatch(/Hono\s+hono\s+4\+\s+API only/);
    expect(stdout).toContain("* Vite and Astro need a server");
    expect(stdout).not.toContain("Next:");
  });

  it("takes no arguments", async () => {
    const { json, code } = await run(["frameworks", "next", "--json"], {
      cwd: tmpProject("empty"),
    });
    expect(code).toBe(2);
    expect(json.error?.code).toBe("PUCK-CLI-INVALID-ARGS");
  });
});
