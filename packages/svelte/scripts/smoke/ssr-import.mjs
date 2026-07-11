// SSR-safety smoke: importing the compiled layer in plain node (no DOM) must
// not throw — SvelteKit adds this package to `ssr.noExternal` (it has a
// `svelte` field), so the module graph is evaluated on the server.
const mod = await import("../../dist/index.js");

if (typeof mod.transformConfig !== "function") {
  throw new Error("ssr-import: transformConfig missing from dist");
}
if (typeof mod.migrate !== "function") {
  throw new Error("ssr-import: migrate missing from dist");
}

console.log("  ✅ SSR import: dist evaluates in node without DOM");
