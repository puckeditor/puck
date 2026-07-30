# Puck + Next.js recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe connects Puck to the [Next.js App Router](https://nextjs.org/docs/app), so you can create and edit pages for any route in this app.

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

When a URL ends in `/edit`, [`proxy.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) sends the request to the Puck editor route (`app/puck/[...puckPath]/page.tsx`). The editor loads the saved page, or starts with an empty page if the path is new.

Selecting **Publish** sends the page data to the `/puck/api` endpoint (`app/puck/api/route.ts`). The handler writes the JSON to `database.json` and clears the Next.js cache for that page. The catch-all route (`app/[...puckPath]/page.tsx`) then loads the same data and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                                | Purpose                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `puck.config.tsx`                   | Defines the components, fields, and default props available to Puck. Add your own components here. |
| `app/puck/[...puckPath]/page.tsx`   | Loads page data for the editor.                                                                    |
| `app/puck/[...puckPath]/client.tsx` | Renders the editor and publishes changes.                                                          |
| `app/[...puckPath]/page.tsx`        | Loads and renders published pages.                                                                 |
| `app/puck/api/route.ts`             | Saves published pages.                                                                             |
| `proxy.ts`                          | Routes URLs ending in `/edit` to `/puck/[...puckPath]/page.tsx`.                                   |
| `lib/get-page.ts`                   | Reads page data from `database.json`. Replace this with your own data fetching logic.              |
| `database.json`                     | Acts as a local database. Replace this with your own database solution.                            |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and API.** The `/edit` routes and `/puck/api` endpoint are public by default. Add authentication and authorization so only trusted users can edit or publish pages.
- **Add your component library.** Replace the example `HeadingBlock` in `puck.config.tsx` with the components and fields your users need.
- **Use a real database.** Replace `database.json` in `lib/get-page.ts` and `app/puck/api/route.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a rendering strategy.** `app/[...puckPath]/page.tsx` uses `force-static`. Remove it if a page needs request-time data such as headers, cookies, or user sessions.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
