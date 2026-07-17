# Puck + React Router recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React. Register the UI components you need in the [config object](https://puckeditor.com/docs/integrating-puck/component-configuration), and Puck makes them available inside a drag-and-drop page builder. This recipe connects Puck to [React Router](https://reactrouter.com) in framework mode, so you can use the editor to create or edit pages for any route in this app.

## New to Puck?

Read [What is Puck?](https://puckeditor.com/docs) and the [Getting Started guide](https://puckeditor.com/docs/getting-started) first.

In short, Puck has three main pieces:

- A [config](https://puckeditor.com/docs/api-reference/configuration/config) object that defines which components can be used to build pages.
- The [`<Puck>`](https://puckeditor.com/docs/api-reference/components/puck) component that renders the editor and exports the [page as JSON](https://puckeditor.com/docs/api-reference/data-model/data).
- The [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) component that renders the exported JSON as a page.

## Run the recipe

### 1. Start the development server

Run:

```sh
npm run dev
```

Once the server is running, navigate to [http://localhost:5173](http://localhost:5173) to view the home page, or [http://localhost:5173/edit](http://localhost:5173/edit) to edit it with Puck.

### 2. Create a page

Navigate to [http://localhost:5173/edit](http://localhost:5173/edit), open the `Blocks` tab in the left sidebar and build your page by dragging components onto the canvas.

### 3. Publish the page

Once your page is ready, select **Publish** in the header to save the result, then navigate to [http://localhost:5173](http://localhost:5173) to view the published page.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it. The route `/your/path` will render the page.

## How it works

When a URL ends in `/edit`, `resolvePuckPath` (`app/lib/resolve-puck-path.server.ts`) returns the path of the page being edited. The loader in `app/routes/puck-splat.tsx` loads the saved page, or starts with an empty page if the path is new.

Selecting **Publish** sends the page data to the action in `app/routes/puck-splat.tsx`. The action writes the JSON to `database.json`. The route then loads the same data and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                                  | Purpose                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `puck.config.tsx`                     | Defines the components, fields, and default props available to Puck. Add your own components here.        |
| `app/routes.ts`                       | Registers the home page and catch-all page route.                                                         |
| `app/routes/puck-splat.tsx`           | Loads and saves page data, then renders the editor or published page.                                     |
| `app/routes/_index.tsx`               | Loads and renders the home page.                                                                          |
| `app/lib/resolve-puck-path.server.ts` | Maps an `/edit` URL to the path of the page being edited.                                                 |
| `app/lib/pages.server.ts`             | Reads and writes page data in `database.json`. Replace this with your own data fetching and saving logic. |
| `app/components/puck-render.tsx`      | Renders saved page data with `<Render>`.                                                                  |
| `database.json`                       | Acts as a local database. Replace this with your own database solution.                                   |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and publishing.** The `/edit` routes and publish action are public by default. Add authentication and authorization so only trusted users can edit or publish pages.
- **Add your component library.** Replace the example `HeadingBlock` in `puck.config.tsx` with the components and fields your users need.
- **Use a real database.** Replace `database.json` and the functions in `app/lib/pages.server.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a deployment strategy.** This recipe uses server-side rendering, loaders, and actions. Deploy it to a React Router-compatible server runtime.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [React Router framework mode](https://reactrouter.com/start/framework/installation)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
