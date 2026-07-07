# Puck + Vue recipe

A minimal [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) template for
[Puck](https://puckeditor.com), using [`@puckeditor/vue`](https://www.npmjs.com/package/@puckeditor/vue).

Your Puck components are plain Vue components — **no React dependency required**.
Preact is bundled inside `@puckeditor/vue` as an internal implementation detail.

## Run

```sh
npm install
npm run dev
```

- `/edit` — the Puck editor
- `/` — the published page, rendered with `<Render>`

Data is persisted to `localStorage` on publish.

## How it works

- `src/puck.config.ts` — your `VueConfig`. Each component's `render` is a Vue
  component; `fields`, `defaultProps`, `resolveData`, etc. work exactly as in
  `@puckeditor/core`.
- Slots (`type: "slot"`) are rendered in your template with
  `<component :is="items" />` (see `src/components/Flex.vue`).
- `src/pages/Editor.vue` mounts `<Puck>`; `src/pages/Page.vue` mounts `<Render>`.

### Notes

- Import the styles once with `import "@puckeditor/vue/puck.css"`.
- To share Pinia / plugins / global components with your Puck components, pass an
  (unmounted) app instance via the `app` prop:
  `<Puck :app="myApp" ... />`.
- Custom fields: set a field to `{ type: "custom", render: MyVueField }`. The
  `FieldLabel` component is exported for native-looking labels.
- Rich text fields are not supported from Vue yet.
