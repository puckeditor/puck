import type { Options } from "tsup";
import { cssModulePlugin } from "./css-module-plugin";

const config: Options = {
  dts: true,
  format: ["cjs", "esm"],
  inject: ["../tsup-config/react-import.js"],
  external: [
    "react",
    "react-dom",
    "@puckeditor/core",
    "@dnd-kit/react",
    "@dnd-kit/dom",
    "@dnd-kit/abstract",
    "@dnd-kit/state",
    "@dnd-kit/geometry",
    "@dnd-kit/utilities",
  ],
  esbuildPlugins: [cssModulePlugin],
};

export default config;
