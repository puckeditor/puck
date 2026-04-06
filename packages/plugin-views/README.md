# @puckeditor/plugin-views

`@puckeditor/plugin-views` adds data-source driven field connections to Puck components.

## Experimental

This package is **experimental**.

- APIs may change without notice.
- Use in production only if you can tolerate breaking changes.

## Install

```bash
pnpm add @puckeditor/plugin-views
```

Include styles in your editor route:

```ts
import "@puckeditor/plugin-views/styles.css";
```

## Basic usage

Define your view sources. You can use the Puck fields API.

```ts
import type { ViewSources } from "@puckeditor/plugin-views";

export const viewSources: ViewSources = {
  people: {
    fields: {
      eyeColor: {
        type: "select",
        options: [
          { label: "Blue", value: "blue" },
          { label: "Brown", value: "brown" },
        ],
      },
    },
    fetch: async (params) => {
      // Fetch from DB/service directly
      return [{ name: "Luke", eye_color: "blue" }];
    },
  },
};
```

Enable the plugin in the editor

```ts
import { createViewsPlugin } from "@puckeditor/plugin-views";

const viewsPlugin = createViewsPlugin({
  sources: viewSources,
});
```

Wrap component configs with `withView`

```ts
import { withView } from "@puckeditor/plugin-views/configure";
import type { ComponentConfig } from "@puckeditor/core";

export const hero = withView<ComponentConfig<HeroProps>>(
  {
    fields: {
      heading: { type: "text" },
      description: { type: "textarea" },
    },
    render: Hero,
  },
  viewSources
);
```

Under the hood, ` withView`` adds a  `type: "view"` field and configures resolveData.

## Connecting placeholder data

Placeholder data can be used for templating pages. To use placeholder data, add the `reference` field to your view source. This will be populated when Puck is provided with `references` metadata.

```ts
import type { ViewSources } from "@puckeditor/plugin-views";

export const viewSources: ViewSources = {
  people: {
    fields: {
      id: { type: "reference" },
    },
    fetch: async (params) => {
      if (typeof params.id === "object" && params.id.reference) {
        return { heading: "placeholder" };
      }

      if (params.id) {
        // ... lookup content using params.id, and return
      }
    },
  },
};
```

Configure the available references via your plugin

```ts
import { createViewsPlugin } from "@puckeditor/plugin-views";

const viewsPlugin = createViewsPlugin({
  sources: viewSources,
  references: [{ label: "URL ID", value: "url_id" }],
});
```

Resolve the page by providing in `references` metadata into `resolveAllData`.

```tsx
import { resolveAllData } from "@puckeditor/core";

export const Page = () => {
  const resolved = await resolveAllData(data, config, {
    references: { url_id: "123" },
  });

  return <Render data={resolved} config={config} />;
};
```
