import path from "node:path";
import { parseModule } from "../src/ast/parse";
import { getModuleReferences } from "../src/ast/imports";
import { exists, read, readRecipe, run, tmpProject } from "./helpers/harness";
import {
  nextDynamicRoot,
  nextMinimal,
  nextPages,
  nextSrc,
  nextWithMiddleware,
  rrMinimal,
  viteSpa,
  vinextMinimal,
  tanstackMinimal,
} from "./helpers/fixtures";
import { normalizeModule } from "./helpers/semantic";

/** Every relative import in the created files resolves to a file that exists */
const expectImportsResolve = (root: string, files: string[]) => {
  for (const file of files.filter((f) => /\.tsx?$/.test(f))) {
    const code = read(root, file);
    for (const ref of getModuleReferences(parseModule(code, file), code)) {
      if (!ref.source.startsWith(".") || ref.source.includes("+types"))
        continue;
      const target = path.posix.join(path.posix.dirname(file), ref.source);
      const found = ["", ".ts", ".tsx", ".js"].some((ext) =>
        exists(root, target + ext)
      );
      expect({ file, import: ref.source, found }).toEqual({
        file,
        import: ref.source,
        found: true,
      });
    }
  }
};

const EDITOR_FILES = [
  "app/[...puckPath]/client.tsx",
  "app/[...puckPath]/page.tsx",
  "app/puck/[...puckPath]/client.tsx",
  "app/puck/[...puckPath]/page.tsx",
  "app/puck/api/route.ts",
  "app/puck/page.tsx",
  "lib/get-page.ts",
];

const TANSTACK_EDITOR_FILES = [
  "src/routes/$.tsx",
  "src/lib/pages.ts",
  "src/lib/pages.server.ts",
  "src/lib/resolve-puck-path.ts",
  "src/components/puck-render.tsx",
];

describe("add editor (TanStack Start)", () => {
  it("integrates into a tanstack create --blank project", async () => {
    const root = tmpProject({ tree: tanstackMinimal() });
    const indexBefore = read(root, "src/routes/index.tsx");

    const { json, runner } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(json.project).toMatchObject({
      framework: "tanstack-start",
      appDir: "src",
    });
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@^0.23.0",
    ]);
    for (const file of TANSTACK_EDITOR_FILES) {
      expect({ file, content: read(root, file) }).toEqual({
        file,
        content: readRecipe("tanstack-start", file),
      });
    }
    expect(read(root, "puck.config.tsx")).toBe(
      readRecipe("tanstack-start", "puck.config.tsx")
    );
    expect(exists(root, "database.json")).toBe(true);
    // The existing home page is kept
    expect(read(root, "src/routes/index.tsx")).toBe(indexBefore);
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-HOME-NOT-MANAGED"
    );
    expect(json.puck).toMatchObject({ installed: true, configured: true });
    expect(json.nextSteps).toContain("# then open http://localhost:3000/edit");
    // Matches the scaffold's quote style
    expect(read(root, "vite.config.ts")).toContain(
      "  optimizeDeps: {\n    include: ['@puckeditor/core'],\n  },"
    );
    expectImportsResolve(root, TANSTACK_EDITOR_FILES);
  });

  it("follows a custom srcDirectory and fixes up imports", async () => {
    const root = tmpProject({ tree: tanstackMinimal({ srcDirectory: "app" }) });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    const files = TANSTACK_EDITOR_FILES.map((f) => f.replace(/^src\//, "app/"));
    for (const file of files) expect(exists(root, file)).toBe(true);
    expect(exists(root, "src")).toBe(false);
    expectImportsResolve(root, files);
  });

  it("adds the Cloud route with AI and leaves an existing splat route alone", async () => {
    const tree = {
      ...tanstackMinimal(),
      "src/routes/$.tsx": "export const Route = null;\n",
    };
    const root = tmpProject({ tree });
    const { json } = await run(
      ["init", "--yes", "--json", "--ai", "--api-key", "sk-valid-key"],
      { cwd: root }
    );

    expect(read(root, "src/routes/$.tsx")).toBe("export const Route = null;\n");
    expect(json.actions).toContainEqual(
      expect.objectContaining({
        type: "manual_edit",
        file: "src/routes/$.tsx",
        reason: "conflict",
      })
    );
    expect(read(root, "src/routes/api/puck/$.ts")).toBe(
      readRecipe("tanstack-start-ai", "src/routes/api/puck/$.ts")
    );
  });
});

describe("add editor (vinext)", () => {
  it("integrates the Next.js App Router files into a vinext app", async () => {
    const root = tmpProject({ tree: vinextMinimal() });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(json.project?.framework).toBe("vinext");
    for (const file of EDITOR_FILES) {
      expect(normalizeModule(read(root, file), file)).toBe(
        normalizeModule(readRecipe("vinext", file), file)
      );
    }
    expect(read(root, "proxy.ts")).toBe(readRecipe("vinext", "proxy.ts"));
    expect(json.nextSteps).toContain("# then open http://localhost:3000/edit");
  });

  it("loads @vercel/oidc with Node when the editor is created with AI", async () => {
    const root = tmpProject({ tree: vinextMinimal() });
    const { json } = await run(
      ["init", "--yes", "--json", "--ai", "--api-key", "sk-valid-key"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "vite.config.ts")).toContain(
      'ssr: { external: ["@vercel/oidc"] }'
    );
  });

  it("wins over next when a migrated project keeps both", async () => {
    const root = tmpProject({ tree: vinextMinimal({ withNext: true }) });
    const { json } = await run(["status", "--json"], { cwd: root });

    expect(json.project?.framework).toBe("vinext");
  });

  it("keeps the middleware convention when middleware.ts exists", async () => {
    const root = tmpProject({ tree: vinextMinimal({ middleware: true }) });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(exists(root, "proxy.ts")).toBe(false);
    expect(json.actions).toContainEqual(
      expect.objectContaining({ type: "manual_edit", file: "middleware.ts" })
    );
  });
});

describe("add editor (Next.js)", () => {
  it("integrates into a create-next-app project", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    const pageBefore = read(root, "app/page.tsx");

    const { json, runner } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(runner.calls[0].args).toEqual([
      "install",
      "@puckeditor/core@^0.23.0",
    ]);
    for (const file of EDITOR_FILES) {
      expect(normalizeModule(read(root, file), file)).toBe(
        normalizeModule(readRecipe("next", file), file)
      );
    }
    expect(read(root, "proxy.ts")).toBe(readRecipe("next", "proxy.ts"));
    expect(read(root, "puck.config.tsx")).toBe(
      readRecipe("next", "puck.config.tsx")
    );
    // The existing home page is kept
    expect(read(root, "app/page.tsx")).toBe(pageBefore);
    expect(json.warnings.map((w) => w.code)).toContain(
      "PUCK-CLI-W-HOME-NOT-MANAGED"
    );
    expect(json.puck).toMatchObject({ installed: true, configured: true });
  });

  it("places files under src/ and fixes up imports", async () => {
    const root = tmpProject({ tree: nextSrc() });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(exists(root, "src/app/puck/[...puckPath]/page.tsx")).toBe(true);
    expect(exists(root, "src/lib/get-page.ts")).toBe(true);
    expect(exists(root, "src/proxy.ts")).toBe(true);
    expect(exists(root, "puck.config.tsx")).toBe(true);
    expectImportsResolve(root, json.filesCreated);
  });

  it("creates middleware.ts for Next.js 15", async () => {
    const root = tmpProject({ tree: nextMinimal({ next: "^15.3.0" }) });
    await run(["add", "editor", "--yes", "--json"], { cwd: root });
    expect(read(root, "middleware.ts")).toBe(
      readRecipe("next", "proxy.ts").replace(
        "function proxy",
        "function middleware"
      )
    );
    expect(exists(root, "proxy.ts")).toBe(false);
  });

  it("leaves existing middleware alone and explains the rewrite", async () => {
    const root = tmpProject({ tree: nextWithMiddleware() });
    const before = read(root, "middleware.ts");
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(read(root, "middleware.ts")).toBe(before);
    expect(json.actions).toEqual([
      expect.objectContaining({
        type: "manual_edit",
        required: false,
        file: "middleware.ts",
        snippet: expect.stringContaining("/edit"),
      }),
    ]);
  });

  it("skips the public catch-all when a dynamic root segment exists", async () => {
    const root = tmpProject({ tree: nextDynamicRoot() });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });
    expect(json.status).toBe("success");
    expect(exists(root, "app/[...puckPath]/page.tsx")).toBe(false);
    expect(exists(root, "app/puck/[...puckPath]/page.tsx")).toBe(true);
    expect(json.actions[0]).toMatchObject({
      type: "manual_edit",
      reason: "conflict",
      required: false,
    });
  });

  it("reuses an existing Puck config with a named export", async () => {
    const root = tmpProject({
      tree: {
        ...nextMinimal(),
        "src/puck.config.tsx": `import type { Config } from "@puckeditor/core";\n\nexport const config: Config = { components: {} };\n`,
      },
    });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });
    expect(json.status).toBe("success");
    expect(exists(root, "puck.config.tsx")).toBe(false);
    expect(read(root, "app/puck/[...puckPath]/client.tsx")).toContain(
      `import { config } from "../../../src/puck.config";`
    );
    expectImportsResolve(root, json.filesCreated);
  });

  it("refuses the Pages Router with guidance", async () => {
    const root = tmpProject({ tree: nextPages() });
    const { json, code } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });
    expect(json.error).toMatchObject({
      code: "PUCK-CLI-UNSUPPORTED-ROUTER",
      details: { docs: expect.any(String) },
    });
    expect(code).toBe(3);
  });

  it("refuses unsupported frameworks", async () => {
    const root = tmpProject({ tree: viteSpa() });
    const { json, code } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });
    expect(json.error?.code).toBe("PUCK-CLI-UNSUPPORTED-FRAMEWORK");
    expect(code).toBe(3);
  });

  it("is idempotent", async () => {
    const root = tmpProject({ tree: nextMinimal() });
    await run(["add", "editor", "--yes", "--json"], { cwd: root });
    const again = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });
    expect(again.json).toMatchObject({ status: "success", changed: false });
    expect(again.runner.calls).toEqual([]);
  });
});

describe("add editor (React Router)", () => {
  it("integrates into a create-react-router project", async () => {
    const root = tmpProject({ tree: rrMinimal() });
    const { json } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("success");
    expect(read(root, "app/routes.ts"))
      .toBe(`import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("*", "routes/puck-splat.tsx")] satisfies RouteConfig;
`);
    expect(read(root, "vite.config.ts")).toBe(
      readRecipe("react-router", "vite.config.ts")
    );
    for (const file of [
      "app/routes/puck-splat.tsx",
      "app/lib/pages.server.ts",
      "app/lib/resolve-puck-path.server.ts",
    ]) {
      expect(exists(root, file)).toBe(true);
    }
    // ~/ aliases are rewritten so the app doesn't need the recipe's tsconfig paths
    expect(read(root, "app/routes/puck-splat.tsx")).not.toContain("~/");
    expectImportsResolve(root, json.filesCreated);

    const splat = "app/routes/puck-splat.tsx";
    const recipeWithRelativeImports = readRecipe("react-router", splat).replace(
      /"~\/lib\//g,
      '"../lib/'
    );
    expect(normalizeModule(read(root, splat), splat)).toBe(
      normalizeModule(recipeWithRelativeImports, splat)
    );
  });

  it("then adds cloud before the catch-all", async () => {
    const root = tmpProject({ tree: rrMinimal() });
    await run(["add", "editor", "--yes", "--json"], { cwd: root });
    const { json } = await run(
      ["add", "cloud", "--yes", "--json", "--api-key", "sk-valid-key"],
      { cwd: root }
    );

    expect(json.status).toBe("success");
    expect(read(root, "app/routes.ts")).toContain(
      `[index("routes/home.tsx"), route("api/puck/*", "routes/api.puck.ts"), route("*", "routes/puck-splat.tsx")]`
    );
  });

  it("asks for a manual edit with flatRoutes", async () => {
    const tree = rrMinimal();
    tree[
      "app/routes.ts"
    ] = `import { flatRoutes } from "@react-router/fs-routes";\n\nexport default flatRoutes();\n`;
    const root = tmpProject({ tree });
    const { json, code } = await run(["add", "editor", "--yes", "--json"], {
      cwd: root,
    });

    expect(json.status).toBe("partial");
    expect(code).toBe(11);
    expect(json.actions[0]).toMatchObject({
      type: "manual_edit",
      required: true,
      file: "app/routes.ts",
      snippet: 'route("*", "routes/puck-splat.tsx"),',
    });
    expect(exists(root, "app/routes/puck-splat.tsx")).toBe(true);
  });
});
