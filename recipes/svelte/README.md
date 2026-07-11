# Puck + Svelte recipe

A minimal [Svelte 5](https://svelte.dev/) + [Vite](https://vitejs.dev/) template
for [Puck](https://puckeditor.com), using
[`@puckeditor/svelte`](https://www.npmjs.com/package/@puckeditor/svelte).

Your Puck components are plain Svelte components — **no React dependency
required**. Preact is bundled inside `@puckeditor/svelte` as an internal
implementation detail.

## Run

```sh
npm install
npm run dev
```

- `/edit` — the Puck editor
- `/` — the published page, rendered with `<Render>`

Data is persisted to `localStorage` on publish.

## How it works

- `src/puck.config.ts` — your `SvelteConfig`. Each component's `render` is a
  Svelte component; `fields`, `defaultProps`, `resolveData`, etc. work exactly
  as in `@puckeditor/core`.
- Slots (`type: "slot"`) are rendered in your component with
  `<PuckSlot name="items" />` (see `src/components/Flex.svelte`); inline text
  and rich text fields with `<PuckText name="…" />`.
- `src/pages/Editor.svelte` mounts `<Puck>`; `src/pages/Page.svelte` mounts
  `<Render>`.

### Notes

- `vite.config.ts` dedupes `svelte` and excludes `@puckeditor/svelte` from
  prebundling — both are required so the package's raw Svelte source layer is
  compiled by your app against your app's single Svelte runtime.
- The editor is client-only. `<Render>` also mounts client-side in v1 — the
  framework-agnostic utilities (`migrate`, `resolveAllData`, …) are safe to
  import on the server.
