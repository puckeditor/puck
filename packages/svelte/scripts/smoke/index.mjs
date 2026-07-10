// Headless smoke driver for @puckeditor/svelte. Sets up jsdom, bundles the test
// harness (source layer + fixtures compiled by svelte/compiler; the compiled
// dist — core already aliased to preact — re-bundled inline), then runs it.
//
// This simulates what vite-plugin-svelte does in a real app: compile the raw
// `.svelte` source layer against svelte's runtime. Full two-layer package
// resolution + drag/overlay is verified in apps/demo-svelte.
import { build } from "esbuild";
import { compile, compileModule } from "svelte/compiler";
import { readFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { setupDom } = require("tsup-config/smoke-env.cjs");
const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Compile `.svelte` and `.svelte.js` on the fly, the way vite-plugin-svelte would. */
const sveltePlugin = {
  name: "svelte",
  setup(b) {
    b.onLoad({ filter: /\.svelte$/ }, (args) => {
      const { js } = compile(readFileSync(args.path, "utf8"), {
        filename: args.path,
        generate: "client",
        css: "injected",
        dev: false,
      });
      return { contents: js.code, loader: "js" };
    });
    b.onLoad({ filter: /\.svelte\.js$/ }, (args) => {
      const { js } = compileModule(readFileSync(args.path, "utf8"), {
        filename: args.path,
        generate: "client",
        dev: false,
      });
      return { contents: js.code, loader: "js" };
    });
  },
};

async function main() {
  setupDom();

  const outfile = path.join(
    mkdtempSync(path.join(tmpdir(), "puck-svelte-smoke-")),
    "bundle.mjs"
  );

  await build({
    entryPoints: [path.join(dirname, "harness.js")],
    outfile,
    bundle: true,
    format: "esm",
    splitting: false, // inline dynamic imports → single self-contained file
    platform: "browser",
    mainFields: ["browser", "module", "main"],
    conditions: ["browser", "import", "default"],
    plugins: [sveltePlugin],
    logLevel: "warning",
  });

  const mod = await import(pathToFileURL(outfile).href);
  const { passed, failed, results } = await mod.run();

  console.log("\n@puckeditor/svelte bridge smoke tests\n");
  console.log(results.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
