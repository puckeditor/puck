import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "jsdom",

  // Setup file to configure the testing environment before each test runs (stubs for ResizeObserver and matchMedia)
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],

  // Treat these files as ESM so `import`/`export` keep working
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  transform: {
    // Let ts-jest compile TS/JS for Jest
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true }],
  },

  // Re-enable transform *inside* selected node_modules
  transformIgnorePatterns: [
    "/node_modules/(?!(?:@preact/signals-core|@preact/signals-react|@dnd-kit)/)",
  ],
  moduleNameMapper: {
    // Map @puckeditor/core imports to the source files for testing
    "^@puckeditor/core$": "<rootDir>/../core/bundle/core.ts",
    "^@puckeditor/core/internal$": "<rootDir>/../core/bundle/internal.ts",
    "^@puckeditor/core/rsc$": "<rootDir>/../core/bundle/rsc.tsx",
    // stub out style & asset imports
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
  },
};

export default config;
