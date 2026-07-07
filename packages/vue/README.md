# @puckeditor/vue

Use the [Puck](https://puckeditor.com) visual editor in [Vue 3](https://vuejs.org/)
apps, with **Vue components as your Puck components**. No React dependency in
your app.

Internally this package compiles `@puckeditor/core` against
[Preact](https://preactjs.com/) and bundles Preact as an implementation detail —
you never install or import React or Preact.

## Install

```sh
npm i @puckeditor/vue vue
```

`vue` (`^3.3`) is a peer dependency.

## Usage

```ts
// puck.config.ts
import type { VueConfig } from "@puckeditor/vue";
import Heading from "./Heading.vue";

export const config: VueConfig = {
  components: {
    Heading: {
      fields: { title: { type: "text" } },
      defaultProps: { title: "Hello" },
      render: Heading, // a Vue component
    },
  },
};
```

```vue
<!-- Editor.vue -->
<script setup lang="ts">
import { Puck } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config } from "./puck.config";

const data = { root: {}, content: [] };
</script>

<template>
  <div style="height: 100vh">
    <Puck :config="config" :data="data" @publish="save" />
  </div>
</template>
```

```vue
<!-- Page.vue -->
<script setup lang="ts">
import { Render } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config } from "./puck.config";
</script>

<template>
  <Render :config="config" :data="data" />
</template>
```

## Exports

- `Puck`, `Render` — Vue host components.
- `usePuck()` — per-component Puck context composable.
- `FieldLabel` — Vue field label with native styling.
- `transformConfig`, `transformFieldTypes` — lower-level config transforms.
- `defineVueComponent`, `defineVueField` — escape hatches for mixed React/Vue configs.
- All framework-agnostic `@puckeditor/core` types and utilities (`Config`, `Field`, `Data`, `walkTree`, `migrate`, `resolveAllData`, …).

## Features

- Vue components for components, slots (`<component :is>`), and custom fields.
- Vue-local state survives field edits (components patch in place, never remount).
- Share Pinia / plugins / global components via the `app` prop.
- `<style scoped>` styles work in the editor iframe automatically.

See the [Using with Vue guide](https://puckeditor.com/docs/integrating-puck/using-with-vue)
for full documentation.

## Not yet supported

- Rich text fields (`type: "richtext"`) from Vue.
- Vue versions of advanced `overrides` / `plugins` (passed through as Preact components).

## License

MIT
