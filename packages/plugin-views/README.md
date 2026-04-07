# @puckeditor/plugin-views

`@puckeditor/plugin-views` adds page-level data views to Puck.

A view is a named subset of API data. Developers can ship built-in views such as `topProducts`, editors can create their own views in the left sidebar, and fields can consume view data through template strings or direct field bindings.

## Install

```bash
pnpm add @puckeditor/plugin-views
```

Include the plugin styles in the editor route:

```ts
import "@puckeditor/plugin-views/styles.css";
```

## Define view sources

View sources are form-driven. Their `fields` shape becomes the query-builder UI and `fetch` returns the data for a single view.

```ts
import type { ViewSources } from "@puckeditor/plugin-views";

export const viewSources: ViewSources = {
  products: {
    fields: {
      category: {
        type: "select",
        options: [
          { label: "All", value: "all" },
          { label: "Apparel", value: "apparel" },
        ],
      },
      limit: {
        type: "number",
        min: 1,
        max: 6,
      },
    },
    fetch: async (params, { metadata, root, viewId }) => {
      return [];
    },
  },
};
```

## Add built-in views

```ts
import type { BuiltInView } from "@puckeditor/plugin-views";

export const builtInViews: BuiltInView[] = [
  {
    id: "topProducts",
    label: "Top products",
    source: "products",
    params: {
      category: "all",
      limit: 3,
    },
  },
];
```

## Editor plugin

```ts
import { createViewsPlugin } from "@puckeditor/plugin-views";

export const viewsPlugin = createViewsPlugin({
  sources: viewSources,
  builtInViews,
});
```

Use it in Puck:

```tsx
<Puck config={config} data={data} plugins={[viewsPlugin]} />
```

## Runtime integration

Wrap the full config with `withViews`. This composes with existing `resolveData` and applies view bindings and template strings during editor resolution and `resolveAllData`.

```ts
import { withViews } from "@puckeditor/plugin-views/configure";

const configWithViews = withViews(config, {
  sources: viewSources,
  builtInViews,
});
```

Server-side rendering stays the normal Puck flow:

```ts
import { resolveAllData } from "@puckeditor/core";

const resolved = await resolveAllData(data, configWithViews, metadata);
```

## Templates

V1 supports path-only template strings:

```ts
"Featured: {{ topProducts[0].name }}"
```

- Multiple placeholders are supported in one string.
- Whitespace inside `{{ ... }}` is ignored.
- Missing paths resolve to an empty string.

## Stored data

- Custom views are stored on `root.props.__puck_views.custom`
- Field templates and direct bindings are stored on `props.__puck_view_state`

You can override those keys with `storageKey` and `nodeStateKey`.

## Notes

- Built-in views are read-only in the sidebar, but editors can duplicate them into custom views.
- Direct field bindings are supported for `text`, `textarea`, `number`, `select`, `radio`, and `array`.
- Template authoring is supported for `text` and `textarea`.
- The older per-component `withView` API has been removed.
