# Puck + Vite recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe adds Puck to a [Vite](https://vite.dev) React app. A small [Hono](https://hono.dev) server in `server/` stores pages. Vite runs it in development with [`@hono/vite-dev-server`](https://github.com/honojs/vite-plugins/tree/main/packages/dev-server), and `npm start` serves it with the built app in production.

## Run the recipe

### 1. Start the development server

Run:

```sh
npm run dev
```

Once the server is running, navigate to [http://localhost:5173](http://localhost:5173) to view the home page, or [http://localhost:5173/edit](http://localhost:5173/edit) to edit it with Puck.

### 2. Publish a page

Open the `Blocks` tab in the left sidebar and drag components onto the canvas. Once your page is ready, select **Publish** in the header to save it, then navigate to [http://localhost:5173](http://localhost:5173) to view it.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it.

## How it works

`PuckRoot` (`src/puck/root.tsx`) wraps the app in `src/main.tsx`. When a URL ends in `/edit`, it renders the editor for that path instead of the app. The editor is loaded on demand, so it stays out of the app's bundle.

Selecting **Publish** sends the page to `POST /api/pages`, which writes it to `database.json`. `<PuckPage>` (`src/puck/page.tsx`) loads a published page from `GET /api/pages` and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render). Put it wherever your app renders pages; this recipe's `App` renders it for every URL.

| File                   | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `src/puck.config.tsx`  | Defines the components, fields, and default props available to Puck. Add your own components here. |
| `src/puck/root.tsx`    | Renders the editor at `/edit` URLs, and your app everywhere else.                                  |
| `src/puck/editor.tsx`  | Loads the page being edited and publishes changes.                                                 |
| `src/puck/page.tsx`    | Loads and renders a published page.                                                                |
| `src/puck/pages.ts`    | Calls the pages API.                                                                               |
| `server/index.ts`      | The Hono app serving Puck's APIs.                                                                  |
| `server/puck/pages.ts` | Reads and writes page data in `database.json`. Replace this with your own database.                |
| `server/prod.ts`       | Serves the built app and the APIs in production.                                                   |
| `database.json`        | Acts as a local database. Replace this with your own database solution.                            |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit` routes and `/api/pages` route are public by default. Add authentication and authorization.
- **Add your component library.** Replace the example `HeadingBlock` in `src/puck.config.tsx` with the components and fields your users need.
- **Use a real database.** Replace `database.json` and `server/puck/pages.ts`. Local files are not reliable across server instances or serverless deployments.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Vite](https://vite.dev)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
