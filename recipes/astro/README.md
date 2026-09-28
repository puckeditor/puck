# Puck + Astro recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe adds Puck to an [Astro](https://astro.build) site. The editor runs as a React island, published pages are rendered on the server, and the [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/) serves Puck's API routes on demand while the rest of the site can stay static.

## Run the recipe

### 1. Start the development server

Run:

```sh
npm run dev
```

Once the server is running, navigate to [http://localhost:4321](http://localhost:4321) to view the home page, or [http://localhost:4321/edit](http://localhost:4321/edit) to edit it with Puck.

### 2. Publish a page

Open the `Blocks` tab in the left sidebar and drag components onto the canvas. Once your page is ready, select **Publish** in the header to save it, then navigate to [http://localhost:4321](http://localhost:4321) to view it.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it.

## How it works

`src/pages/[...puckPath].astro` handles every URL without its own page. When a URL ends in `/edit`, it renders the editor for that path as a client-only React island. Otherwise it loads the published page and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) on the server, so no editor code is sent to visitors.

| File                            | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/puck.config.tsx`           | Defines the components, fields, and default props available to Puck. Add your own components here. |
| `src/pages/[...puckPath].astro` | Renders the editor at `/edit` URLs, and published pages everywhere else.                           |
| `src/pages/api/pages.ts`        | Loads and saves pages for the editor.                                                              |
| `src/puck/editor.tsx`           | Loads the page being edited and publishes changes.                                                 |
| `src/puck/render.tsx`           | Renders a published page.                                                                          |
| `src/lib/pages.ts`              | Reads and writes page data in `database.json`. Replace this with your own database.                |
| `database.json`                 | Acts as a local database. Replace this with your own database solution.                            |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit` routes and `/api/pages` route are public by default. Add authentication and authorization.
- **Add your component library.** Replace the example `HeadingBlock` in `src/puck.config.tsx` with the components and fields your users need.
- **Use a real database.** Replace `database.json` and `src/lib/pages.ts`. Local files are not reliable across server instances or serverless deployments.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Astro](https://docs.astro.build)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
