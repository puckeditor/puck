# Puck + TanStack Start recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe connects Puck to [TanStack Start](https://tanstack.com/start/latest), so you can create and edit pages for any route in this app.

## Core concepts

If you're new to Puck, this section introduces the core concepts you need to know.

### Puck

The Puck visual editor has three main parts: a config, the editor, and the renderer.

#### Config

The [config](https://puckeditor.com/docs/integrating-puck/component-configuration) registers the components users can use to build pages in the editor and the fields they can edit.

```tsx
const config = {
  components: {
    HeadingBlock: {
      fields: {
        title: { type: "text" },
      },
      render: ({ title }) => <h1>{title}</h1>,
    },
  },
};
```

#### The editor

The [`<Puck>`](https://puckeditor.com/docs/api-reference/components/puck) component renders the editor. It uses a config, exports [pages as JSON](https://puckeditor.com/docs/api-reference/data-model/data), and accepts initial page data for editing existing pages.

```tsx
<Puck
  config={config} // The components available to the editor
  data={data} // The page JSON to edit
  onPublish={(data) => {
    // Save data to your database
  }}
/>
```

#### The renderer

The [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) component renders pages. It expects the page JSON and the config used to create that page.

```tsx
<Render
  config={config} // The components used to create the page
  data={data} // The page JSON to render
/>
```

## Run the recipe

### 1. Start the development server

Run:

```sh
npm run dev
```

Once the server is running, navigate to [http://localhost:3000](http://localhost:3000) to view the home page, or [http://localhost:3000/edit](http://localhost:3000/edit) to edit it with Puck.

### 2. Create a page

Navigate to [http://localhost:3000/edit](http://localhost:3000/edit), open the `Blocks` tab in the left sidebar and build your page by dragging components onto the canvas.

### 3. Publish the page

Once your page is ready, select **Publish** in the header to save the result, then navigate to [http://localhost:3000](http://localhost:3000) to view the published page.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it. The route `/your/path` will render the page.

## How it works

When a URL ends in `/edit`, `resolvePuckPath` (`src/lib/index.ts`) returns the path of the page being edited. The loader in `src/routes/$.route.tsx` calls `getPageServerFn` to load the saved page, or starts with an empty page if the path is new.

Selecting **Publish** calls `savePageServerFn` in `src/data/page.ts`. This server function writes the JSON to `database.json`. The catch-all route then loads the same data and renders the published page with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                     | Purpose                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `src/puck.config.tsx`    | Defines the components, fields, and default props. Add your own components here.                      |
| `src/routes/$.route.tsx` | Loads page data and renders the editor or published page.                                             |
| `src/lib/index.ts`       | Maps an `/edit` URL to the path of the page being edited.                                             |
| `src/data/page.ts`       | Reads and writes page data through server functions. Replace this with your own database integration. |
| `src/router.tsx`         | Creates the TanStack router using the generated route tree.                                           |
| `database.json`          | Acts as a local database. Replace this with your own database solution.                               |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and publishing.** The `/edit` routes and page server functions are public by default. Add authentication and authorization so only trusted users can edit or publish pages.
- **Add your component library.** Replace the example `HeadingBlock` in `src/puck.config.tsx` with the components and fields your users need.
- **Use a real database.** Replace `database.json` and the functions in `src/data/page.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a deployment strategy.** This recipe uses server-side rendering and server functions. Deploy it to a TanStack Start-compatible server runtime.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [TanStack Start documentation](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
