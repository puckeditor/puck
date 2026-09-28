# Puck + Hono recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React.

This recipe is a [Hono](https://hono.dev) server that stores Puck pages. It has no editor of its own: point a Puck editor in your React app at it.

## The APIs

| Route                        | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `GET /api/pages?path=/about` | Returns the saved page data for a path, or a 404. |
| `POST /api/pages`            | Saves `{ "path": "/about", "data": { ... } }`.    |

## Run the recipe

### 1. Start the server

Run:

```sh
npm run dev
```

Once the server is running, [http://localhost:3000/api/pages?path=/](http://localhost:3000/api/pages?path=/) returns the home page's data.

### 2. Connect an editor

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

## How it works

| File                | Purpose                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `src/index.ts`      | Creates the Hono app and mounts the Puck routes with `app.route("/", puckPages);`.  |
| `src/puck/pages.ts` | Reads and writes page data in `database.json`. Replace this with your own database. |
| `database.json`     | Acts as a local database. Replace this with your own database solution.             |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the APIs.** The pages API is public by default. Add authentication, authorization to protect page data.
- **Use a real database.** Replace `database.json` and `src/puck/pages.ts`. Local files are not reliable across server instances or serverless deployments.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Hono](https://hono.dev)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
