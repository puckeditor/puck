import { defineConfig } from "tsup";
import tsupconfig from "tsup-config";

export default defineConfig({
  ...tsupconfig,
  dts: { resolve: true },
} as any);
