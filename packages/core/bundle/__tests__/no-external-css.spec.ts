import * as fs from "fs";
import * as path from "path";

const bundleDir = path.resolve(__dirname, "..");

const readBundleFile = (filename: string): string =>
  fs.readFileSync(path.join(bundleDir, filename), "utf-8");

const EXTERNAL_URL_PATTERN = /https?:\/\//;

describe("CSS bundle external dependency contract", () => {
  describe("no-external.css", () => {
    it("should NOT contain any external URL references", () => {
      const content = readBundleFile("no-external.css");
      expect(content).not.toMatch(EXTERNAL_URL_PATTERN);
    });

    it("should import core.css", () => {
      const content = readBundleFile("no-external.css");
      expect(content).toContain("core.css");
    });
  });

  describe("index.css", () => {
    it("should NOT contain any external URL references", () => {
      const content = readBundleFile("index.css");
      expect(content).not.toMatch(EXTERNAL_URL_PATTERN);
    });

    it("should import core.css", () => {
      const content = readBundleFile("index.css");
      expect(content).toContain("core.css");
    });
  });

  describe("fonts.css", () => {
    it("should contain the Inter font external import", () => {
      const content = readBundleFile("fonts.css");
      expect(content).toContain("rsms.me/inter/inter.css");
    });
  });

  describe("index.ts (entry point)", () => {
    it("should import fonts.css for the full bundle", () => {
      const content = readBundleFile("index.ts");
      expect(content).toContain('./fonts.css');
    });

    it("should import index.css", () => {
      const content = readBundleFile("index.ts");
      expect(content).toContain('./index.css');
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
        path.resolve(bundleDir, "..", "tsup.config.ts"),
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
});
