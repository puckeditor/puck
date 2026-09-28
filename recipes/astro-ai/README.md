# Puck AI + Astro recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe adds Puck and Puck AI to an [Astro](https://astro.build) site. The editor runs as a React island, published pages are rendered on the server, and the [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/) serves Puck's API routes on demand while the rest of the site can stay static.

## Run the recipe

### 1. Add a Puck API key

Start by creating an account, [generating an API key](https://cloud.puckeditor.com/api-keys), and adding it to an `.env.local` file:

```sh
PUCK_API_KEY=your-api-key
```

### 2. Start the development server

Run:

```sh
npm run dev
```

Once the server is running, navigate to [http://localhost:4321](http://localhost:4321) to view the home page, or [http://localhost:4321/edit](http://localhost:4321/edit) to edit it with Puck.

### 3. Publish a page

Click the **AI** button in the left sidebar, enter a prompt, and press Enter. Once your page is ready, select **Publish** in the header to save it, then navigate to [http://localhost:4321](http://localhost:4321) to view it.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it.

## How it works

`src/pages/[...puckPath].astro` handles every URL without its own page. When a URL ends in `/edit`, it renders the editor for that path as a client-only React island. Otherwise it loads the published page and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) on the server, so no editor code is sent to visitors.

| File                             | Purpose                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/puck.config.tsx`            | Defines the components, fields, and default props available to Puck. Add your own components here. |
| `src/pages/[...puckPath].astro`  | Renders the editor at `/edit` URLs, and published pages everywhere else.                           |
| `src/pages/api/pages.ts`         | Loads and saves pages for the editor.                                                              |
| `src/pages/api/puck/[...all].ts` | Handles requests from the AI plugin and configures AI generation.                                  |
| `src/puck/editor.tsx`            | Loads the page being edited and publishes changes.                                                 |
| `src/puck/render.tsx`            | Renders a published page.                                                                          |
| `src/lib/pages.ts`               | Reads and writes page data in `database.json`. Replace this with your own database.                |
| `database.json`                  | Acts as a local database. Replace this with your own database solution.                            |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit` routes and `/api/pages` and `/api/puck` routes are public by default. Add authentication, authorization, and rate limits.
- **Add your component library.** Replace the example `HeadingBlock` in `src/puck.config.tsx` with the components and fields your users need.
- **Set your business context.** Replace the example Google context in `src/pages/api/puck/[...all].ts` with clear information about your product, audience, and content rules.
- **Set `PUCK_API_KEY` in production.** `.env.local` is only loaded in development, so set it in the environment wherever the server runs.
- **Use a real database.** Replace `database.json` and `src/lib/pages.ts`. Local files are not reliable across server instances or serverless deployments.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck AI documentation](https://puckeditor.com/docs/ai/overview)
- [Astro](https://docs.astro.build)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
