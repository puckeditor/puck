# @puckeditor/svelte

Use the [Puck](https://puckeditor.com) visual editor in **Svelte 5** apps, with Svelte components as your config components. No React dependency required.

Puck core is compiled against `preact/compat` and bundled into a single artifact; a thin adapter bridges your Svelte components into Puck's render boundary. Your Svelte components patch in place (local state survives prop edits) and can use slots, custom fields, and app-level context.

## Install

```sh
npm install @puckeditor/svelte
# peer dependency
npm install svelte
```

Requires **Svelte 5** and a **Vite** app using [`@sveltejs/vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte) — the package ships a raw Svelte source layer that your app compiles, so it shares your app's single Svelte runtime.

Add `svelte` to `resolve.dedupe` in your Vite config so the bridge and your app share one Svelte instance:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  resolve: { dedupe: ["svelte"] },
});
```

## Usage

```svelte
<!-- Heading.svelte -->
<script>
  let { title = "" } = $props();
</script>
<h1>{title}</h1>
```

```ts
// puck.config.ts
import type { SvelteConfig } from "@puckeditor/svelte";
import Heading from "./Heading.svelte";

export const config: SvelteConfig = {
  components: {
    Heading: {
      fields: { title: { type: "text" } },
      defaultProps: { title: "Heading" },
      render: Heading,
    },
  },
};
```

```svelte
<!-- Editor.svelte -->
<script>
  import { Puck } from "@puckeditor/svelte";
  import "@puckeditor/svelte/puck.css";
  import { config } from "./puck.config";

  let data = { content: [], root: {} };
</script>

<Puck {config} {data} onpublish={(d) => console.log(d)} />
```

Render published data with `<Render {config} {data} />`.

## Exports

- **`Puck`**, **`Render`** — the editor and the renderer. Svelte 5 callback props: `onchange`, `onpublish`, `onaction`, `onready`.
- **`PuckSlot`** — render a `slot` field: `<PuckSlot name="content" />`.
- **`PuckText`** — render a node-valued text field (contentEditable text/textarea/custom, or richtext) inline: `<PuckText name="title" />`.
- **`PuckDropZone`** — an imperative DropZone: `<PuckDropZone zone="…" />`.
- **`PuckChildren`** — the root DropZone (in a custom `root`) or the default UI inside a `fieldTypes` override.
- **`FieldLabel`** — native-looking label markup for custom fields.
- **`getPuck()`** — read the current component's reactive Puck context (`{ isEditing, metadata, id }`).
- **`puckApi(selector?)`** — reactive editor-state subscription (the Svelte equivalent of React's selector-based `usePuck`), e.g. `const selected = puckApi((api) => api.selectedItem)` then `selected.current`.
- **`transformConfig`**, **`transformFieldTypes`**, **`defineSvelteComponent`**, **`defineSvelteField`** — lower-level helpers and per-component escape hatches for mixed configs.
- All of `@puckeditor/core`'s framework-agnostic utilities (`walkTree`, `resolveAllData`, `migrate`, …) and types. (Core's Preact-compiled components are also re-exported for advanced Preact-based `overrides`/`plugins` — they are not usable from Svelte templates.)
- CSS: `@puckeditor/svelte/puck.css` and `@puckeditor/svelte/no-external.css` (self-hosted fonts).

## Features

- **Svelte 5 components** as Puck `render` — plain props, `$state`, snippets.
- **Patch, not remount** — editing fields updates props in place; component-local state survives.
- **Slots** via `<PuckSlot>`, rich/inline text via `<PuckText>`, imperative DropZones via `<PuckDropZone>`.
- **Custom fields** — props `{ id, name, value, onChange, field, readOnly }` (callback idiom).
- **App context** — pass a `Map` as the `context` prop to `<Puck>`/`<Render>`; entries are `setContext`-ed into every bridged component (e.g. a runes store). Read once at setup — later changes to the Map identity are ignored.
- **Scoped styles** render in the editor's iframe (mirrored via AutoFrame).

## Not yet supported

- Server-side rendering of `<Render>` (mounts client-side; the server emits an empty div — the compiled module itself is safe to import in node for `migrate`/`resolveAllData` etc.).
- Svelte versions of advanced `overrides` / `plugins` (passed through as Preact components).
- Rich text / inline-editable fields nested inside `object`/`array` fields (top-level fields only).

## License

MIT
