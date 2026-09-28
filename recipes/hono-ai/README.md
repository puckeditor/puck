# Puck AI + Hono recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe is a [Hono](https://hono.dev) server that stores Puck pages and serves Puck AI. It has no editor of its own: point a Puck editor in your React app at it, and add the Puck AI plugin to that editor.

## The APIs

| Route                        | Purpose                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/pages?path=/about` | Returns the saved page data for a path, or a 404.                                                                                                      |
| `POST /api/pages`            | Saves `{ "path": "/about", "data": { ... } }`.                                                                                                         |
| `/api/puck/*`                | Forwards requests from the Puck AI plugin to Puck Cloud using [`puckHandler`](https://puckeditor.com/docs/api-reference/ai/cloud-client/puck-handler). |

## Run the recipe

### 1. Add a Puck API key

Start by creating an account, [generating an API key](https://cloud.puckeditor.com/api-keys), and adding it to an `.env.local` file:

```sh
PUCK_API_KEY=your-api-key
```

### 2. Start the server

Run:

```sh
npm run dev
```

Once the server is running, [http://localhost:3000/api/pages?path=/](http://localhost:3000/api/pages?path=/) returns the home page's data.

### 3. Connect an editor

Load and save pages from your editor with the pages API:

```tsx
<Puck
  config={config}
  data={await(await fetch("/api/pages?path=/")).json()}
  onPublish={(data) =>
    fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/", data }),
    })
  }
/>
```

If your editor runs on another origin, proxy `/api` to this server in development (for example with Vite's [`server.proxy`](https://vite.dev/config/server-options#server-proxy)), or enable CORS.

The [Puck AI plugin](https://puckeditor.com/docs/api-reference/ai/ai-plugin/installation) calls `/api/puck` on the editor's origin by default. Pass `host` to `createAiPlugin` to call this server directly instead.

## How it works

| File                | Purpose                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`      | Creates the Hono app and mounts the Puck routes with `app.route("/", puckPages);` and `app.route("/", puckCloud);`. |
| `src/puck/pages.ts` | Reads and writes page data in `database.json`. Replace this with your own database.                                 |
| `src/puck/cloud.ts` | Handles requests from the AI plugin and configures AI generation.                                                   |
| `database.json`     | Acts as a local database. Replace this with your own database solution.                                             |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the APIs.** The pages API and `/api/puck` route are public by default. Add authentication, authorization, and rate limits to protect page data and AI usage.
- **Set your business context.** Replace the example Google context in `src/puck/cloud.ts` with clear information about your product, audience, and content rules.
- **Set `PUCK_API_KEY` in production.** `npm start` runs Node without `.env.local`, so set it in the environment wherever the server runs.
- **Use a real database.** Replace `database.json` and `src/puck/pages.ts`. Local files are not reliable across server instances or serverless deployments.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck AI documentation](https://puckeditor.com/docs/ai/overview)
- [Hono](https://hono.dev)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
