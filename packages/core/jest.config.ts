import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/js-with-ts-esm", // TS + ESM
  testEnvironment: "jsdom",

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
    // stub out style & asset imports
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
  },
};

export default config;
