import { defineConfig } from "tsup";
import tsupconfig from "../tsup-config";
import path from "path";
import { createRuntimeCssPlugin } from "../tsup-config/runtime-css-plugin";

export default defineConfig({
  ...tsupconfig,
  esbuildPlugins: [
    ...(tsupconfig.esbuildPlugins ?? []),
    createRuntimeCssPlugin(path.resolve(import.meta.dirname)),
  ],
});
