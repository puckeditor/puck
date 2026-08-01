/**
 * @jest-environment node
 */
import * as fs from "fs";
import * as path from "path";
import { build, type Plugin } from "esbuild";

const bundleDir = path.resolve(__dirname, "..");
const packageRoot = path.resolve(bundleDir, "..");

const readBundleFile = (filename: string): string =>
  fs.readFileSync(path.join(bundleDir, filename), "utf-8");

const EXTERNAL_URL_PATTERN = /https?:\/\//;

// --- Helpers to build CSS the same way tsup.config.ts does ---

const runtimeCssStubPlugin: Plugin = {
  name: "runtime-css-stub",
  setup(buildApi) {
    buildApi.onResolve({ filter: /generated\/runtime-css$/ }, () => ({
      path: "runtime-css-stub",
      namespace: "runtime-css-stub",
    }));

    buildApi.onLoad({ filter: /.*/, namespace: "runtime-css-stub" }, () => ({
      contents: `
          export const defaultUiStyles = "";
          export const iframeInteractionStyles = "";
        `,
      loader: "js" as const,
    }));
  },
};

/**
 * Build an entry point with esbuild and return the emitted CSS string.
 * Mirrors the `readBundledCss` function from tsup.config.ts.
 */
const buildCss = async (entryPoint: string): Promise<string> => {
  const isCssEntry = entryPoint.endsWith(".css");
  const result = await build({
    absWorkingDir: packageRoot,
    bundle: true,
    format: "iife",
    logLevel: "silent",
    packages: "external",
    platform: "browser",
    plugins: [runtimeCssStubPlugin],
    target: ["es2020"],
    outdir: "out",
    write: false,
    ...(isCssEntry
      ? {
          stdin: {
            contents: `import "./${entryPoint}";`,
            loader: "ts" as const,
            resolveDir: packageRoot,
            sourcefile: "runtime-css-entry.ts",
          },
        }
      : {
          entryPoints: [entryPoint],
        }),
  });

  return result.outputFiles
    .filter((file) => file.path.endsWith(".css"))
    .map((file) => file.text.trim())
    .filter(Boolean)
    .join("\n\n");
};

// ===========================================================================
// Source file contract tests
// ===========================================================================

describe("CSS bundle external dependency contract", () => {
  describe("no-external.css (source)", () => {
    it("should NOT contain any external URL references", () => {
      const content = readBundleFile("no-external.css");
      expect(content).not.toMatch(EXTERNAL_URL_PATTERN);
    });

    it("should import core.css", () => {
      const content = readBundleFile("no-external.css");
      expect(content).toContain("core.css");
    });
  });

  describe("index.css (source)", () => {
    it("should NOT contain any external URL references", () => {
      const content = readBundleFile("index.css");
      expect(content).not.toMatch(EXTERNAL_URL_PATTERN);
    });

    it("should import core.css", () => {
      const content = readBundleFile("index.css");
      expect(content).toContain("core.css");
    });
  });

  describe("fonts.css (source)", () => {
    it("should contain the Inter font external import", () => {
      const content = readBundleFile("fonts.css");
      expect(content).toContain("rsms.me/inter/inter.css");
    });
  });

  describe("index.ts (entry point)", () => {
    it("should import fonts.css for the full bundle", () => {
      const content = readBundleFile("index.ts");
      expect(content).toContain("./fonts.css");
    });

    it("should import index.css", () => {
      const content = readBundleFile("index.ts");
      expect(content).toContain("./index.css");
    });
  });

  describe("no-external.ts (entry point)", () => {
    it("should NOT import fonts.css", () => {
      const content = readBundleFile("no-external.ts");
      expect(content).not.toContain("fonts.css");
    });

    it("should import no-external.css", () => {
      const content = readBundleFile("no-external.ts");
      expect(content).toContain("no-external.css");
    });
  });

  describe("runtime CSS source (tsup.config.ts)", () => {
    it("should generate runtime CSS from no-external.ts, not index.ts", () => {
      const tsupConfig = fs.readFileSync(
        path.resolve(packageRoot, "tsup.config.ts"),
        "utf-8"
      );

      // The runtime CSS should be generated from no-external.ts (no external deps)
      expect(tsupConfig).toContain('readBundledCss("bundle/no-external.ts")');

      // It should NOT use index.ts (which would include fonts.css / external import)
      expect(tsupConfig).not.toMatch(
        /readBundledCss\(\s*["']bundle\/index\.ts["']\s*\)/
      );
    });
  });

  // ===========================================================================
  // Built CSS artifact tests (addresses CodeRabbit review feedback)
  // ===========================================================================

  describe("built CSS artifacts", () => {
    it("no-external.ts emitted CSS should NOT contain the rsms.me Inter import", async () => {
      const css = await buildCss("bundle/no-external.ts");
      expect(css).not.toContain("rsms.me");
    });

    it("no-external.ts emitted CSS should NOT contain @import rules", async () => {
      const css = await buildCss("bundle/no-external.ts");
      expect(css).not.toMatch(/@import\s/);
    });

    it("index.ts emitted CSS should contain the Inter font import", async () => {
      const css = await buildCss("bundle/index.ts");
      expect(css).toContain("rsms.me/inter/inter.css");
    });
  });
});
