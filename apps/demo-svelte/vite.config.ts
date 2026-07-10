import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // The single most important line: @puckeditor/svelte keeps `svelte`
    // external, so both its compiled layer's `import "svelte"` AND the raw
    // source layer it compiles MUST resolve to the SAME svelte instance as the
    // app — otherwise runes reactivity + context break across the bridge.
    dedupe: ["svelte"],
  },
  // @puckeditor/svelte ships a raw `.svelte` source layer; let vite-plugin-svelte
  // compile it in the app rather than esbuild trying to prebundle it.
  optimizeDeps: {
    exclude: ["@puckeditor/svelte"],
  },
});
