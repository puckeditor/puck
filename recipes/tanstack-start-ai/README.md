# Puck AI + TanStack Start recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React. It lets you create page builders that use your own components.

[Puck AI](https://puckeditor.com/docs/ai/overview) builds on the same principles to let you generate pages by assembling your existing components or creating new ones on the fly, either as a copilot in the editor or headlessly.

This recipe connects Puck and Puck AI to [TanStack Start](https://tanstack.com/start), so you can create and edit pages for any route in this app.

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

### Puck AI

This recipe adds Puck AI as a copilot. It has two parts: the AI plugin (browser) and the Cloud Client (server).

#### The AI plugin

The [AI plugin](https://puckeditor.com/docs/api-reference/ai/ai-plugin/installation) renders the chat in the editor and sends each message to the Cloud Client on your server.

```tsx
const aiPlugin = createAiPlugin();

function Editor() {
  return <Puck plugins={[aiPlugin]} config={config} data={data} />;
}
```

#### The Cloud Client

The [Cloud Client](https://puckeditor.com/docs/api-reference/ai/cloud-client/installation) provides APIs for connecting your server to the Puck cloud. This recipe uses its [`puckHandler`](https://puckeditor.com/docs/api-reference/ai/cloud-client/puck-handler) API, which receives each chat message, forwards it to the Puck cloud, and streams the response back to the plugin in the browser.

```ts
const options = {
  ai: {
    context: "We are Google. You create Google landing pages.",
  },
};

const handleRequest = ({ request }: { request: Request }) =>
  puckHandler(request, options);

export const Route = createFileRoute("/api/puck/$")({
  server: { handlers: { GET: handleRequest, POST: handleRequest } },
});
```

#### Puck AI modes

Puck AI can build pages in two ways:

- **Assembly mode** only builds pages using components from your config.
- **Design mode** can generate new components when needed.

This recipe comes with [Design mode](https://puckeditor.com/docs/api-reference/ai/cloud-client/puck-handler#aidesignmode) enabled out of the box.

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

Once the server is running, navigate to [http://localhost:3000](http://localhost:3000) to view the home page, or [http://localhost:3000/edit](http://localhost:3000/edit) to edit it with Puck.

### 3. Create a page with Puck AI

Navigate to [http://localhost:3000/edit](http://localhost:3000/edit), click the **AI** button in the left sidebar, enter a prompt, and press Enter.

### 4. Publish the page

Once your page is ready, select **Publish** in the header to save the result, then navigate to [http://localhost:3000](http://localhost:3000) to view the published page.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it. The route `/your/path` will render the page.

## How it works

When a URL ends in `/edit`, `resolvePuckPath` (`src/lib/resolve-puck-path.ts`) returns the path of the page being edited. The loader in `src/routes/$.tsx` calls the `loadPuckPage` server function, which loads the saved page, or starts with an empty page if the path is new.

Selecting **Publish** calls the `publishPuckPage` server function (`src/lib/pages.ts`), which writes the JSON to `database.json`. The route then loads the same data and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                             | Purpose                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `puck.config.tsx`                | Defines the components, fields, and default props available to Puck and Assembly mode. Add your own components here. |
| `src/routes/$.tsx`               | Loads page data, then renders the editor or published page.                                                          |
| `src/routes/index.tsx`           | Loads and renders the home page.                                                                                     |
| `src/routes/api/puck/$.ts`       | Handles requests from the AI plugin and configures AI generation.                                                    |
| `src/lib/pages.ts`               | Server functions that load and publish pages.                                                                        |
| `src/lib/resolve-puck-path.ts`   | Maps an `/edit` URL to the path of the page being edited.                                                            |
| `src/lib/pages.server.ts`        | Reads and writes page data in `database.json`. Replace this with your own data fetching and saving logic.            |
| `src/components/puck-render.tsx` | Renders saved page data with `<Render>`.                                                                             |
| `database.json`                  | Acts as a local database. Replace this with your own database solution.                                              |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit` routes, `publishPuckPage` server function, and `/api/puck` route are public by default. Add authentication, authorization, and rate limits to protect page data and AI usage.
- **Add your component library.** Replace the example `HeadingBlock` in `puck.config.tsx` with the components and fields your users need.
- **Set your business context.** Replace the example Google context in `src/routes/api/puck/$.ts` with clear information about your product, audience, and content rules.
- **Use a real database.** Replace `database.json` and the functions in `src/lib/pages.server.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a deployment strategy.** This recipe uses server-side rendering, loaders, and server functions. Deploy it with one of [TanStack Start's hosting options](https://tanstack.com/start/latest/docs/framework/react/guide/hosting).

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck AI documentation](https://puckeditor.com/docs/ai/overview)
- [Getting started with Puck AI](https://puckeditor.com/docs/ai/getting-started)
- [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
