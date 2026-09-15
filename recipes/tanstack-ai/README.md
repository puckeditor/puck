# Puck AI + TanStack Start recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React. It lets you create page builders that use your own components.

[Puck AI](https://puckeditor.com/docs/ai/overview) builds on the same principles to let you generate pages by assembling your existing components or creating new ones on the fly, either as a copilot in the editor or headlessly.

This recipe connects Puck and Puck AI to [TanStack Start](https://tanstack.com/start/latest), so you can create and edit pages for any route in this app.

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
  server: {
    handlers: {
      DELETE: handleRequest,
      GET: handleRequest,
      POST: handleRequest,
    },
  },
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

When a URL ends in `/edit`, `resolvePuckPath` (`src/lib/index.ts`) returns the path of the page being edited. The loader in `src/routes/$.route.tsx` calls `getPageServerFn` to load the saved page, or starts with an empty page if the path is new.

Selecting **Publish** calls `savePageServerFn` in `src/data/page.ts`. This server function writes the JSON to `database.json`. The catch-all route then loads the same data and renders the published page with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

Both the editor and published-page renderer use `withDynamicConfig` to include components generated by Design mode. The AI API route forwards GET, POST, and DELETE requests to `puckHandler`.

The table below shows the files that implement this flow.

| File                             | Purpose                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/puck.config.tsx`            | Defines the components, fields, and default props. Add your own components here.                      |
| `src/routes/$.route.tsx`         | Loads page data and renders the editor or published page.                                             |
| `src/routes/api.puck.$.ts`       | Handles requests from the AI plugin and configures AI generation.                                     |
| `src/components/puck-render.tsx` | Renders saved pages, including components generated by Design mode.                                   |
| `src/lib/index.ts`               | Maps an `/edit` URL to the path of the page being edited.                                             |
| `src/data/page.ts`               | Reads and writes page data through server functions. Replace this with your own database integration. |
| `src/router.tsx`                 | Creates the TanStack router using the generated route tree.                                           |
| `database.json`                  | Acts as a local database. Replace this with your own database solution.                               |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit` routes, page server functions, and `/api/puck` route are public by default. Add authentication, authorization, and rate limits to protect page data and AI usage.
- **Add your component library.** Replace the example `HeadingBlock` in `src/puck.config.tsx` with the components and fields your users need.
- **Set your business context.** Replace the example Google context in `src/routes/api.puck.$.ts` with clear information about your product, audience, and content rules.
- **Use a real database.** Replace `database.json` and the functions in `src/data/page.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a deployment strategy.** This recipe uses server-side rendering and server functions. Deploy it to a TanStack Start-compatible server runtime.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck AI documentation](https://puckeditor.com/docs/ai/overview)
- [Getting started with Puck AI](https://puckeditor.com/docs/ai/getting-started)
- [TanStack Start documentation](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
