import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: { bin: "src/bin.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outExtension: () => ({ js: ".mjs" }),
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
  clean: false,
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
});
