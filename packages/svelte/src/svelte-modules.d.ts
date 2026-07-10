// The compiled layer imports raw `.svelte` source-layer components as EXTERNAL
// modules (the host app's vite-plugin-svelte compiles them). TypeScript can't
// type a `.svelte` import here, so declare it as an opaque component default.
declare module "*.svelte" {
  const component: any;
  export default component;
}
