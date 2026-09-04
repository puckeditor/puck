import { defineConfig } from "tsup";
import tsupconfig from "../tsup-config";

export default defineConfig({
  ...tsupconfig,
  // The shared config injects `import React from "react"` into every chunk for
  // packages that compile JSX with the classic runtime. This package uses the
  // automatic runtime, and the root entry has no React at all — injecting it
  // would make `@puckeditor/router` unimportable outside a React install.
  inject: [],
  // `next` and `@puckeditor/cloud-client` are only reachable from the framework
  // entries, but they're declared here so adding those entries doesn't require
  // touching the bundler config again.
  external: [
    ...((tsupconfig.external as string[]) ?? []),
    "next",
    "@puckeditor/cloud-client",
  ],
});
