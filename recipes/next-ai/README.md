# Puck AI + Next.js recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React. It lets you create page builders that use your own components.

[Puck AI](https://puckeditor.com/docs/ai/overview) builds on the same principles to let you generate pages by assembling your existing components or creating new ones on the fly, either as a copilot in the editor or headlessly.

This recipe connects Puck and Puck AI to the [Next.js App Router](https://nextjs.org/docs/app), so you can create and edit pages for any route in this app.

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
const handleRequest = (request: NextRequest) => {
  return puckHandler(request, {
    ai: {
      context: "We are Google. You create Google landing pages.",
    },
  });
};

export const DELETE = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
```

#### Puck AI modes

Puck AI can build pages in two ways:

- **Assembly mode** only builds pages using components from your config.
- **Design mode** can generate new components when needed.

This recipe comes with [Design mode](https://puckeditor.com/docs/api-reference/ai/cloud-client/puck-handler#aidesignmode) enabled out of the box.

## Run the recipe

### 1. Add a Puck API key

Start by creating an account, [generating an API key](https://cloud.puckeditor.com/api-keys), and adding it to a `.env.local` file:

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

When a URL ends in `/edit`, [`proxy.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) sends the request to the Puck editor route (`app/puck/[...puckPath]/page.tsx`). The editor loads the saved page, or starts with an empty page if the path is new.

Selecting **Publish** sends the page data to the `/api/pages` endpoint (`app/api/pages/route.ts`). The handler writes the JSON to `database.json` and clears the Next.js cache for that page. The catch-all route (`app/[...puckPath]/page.tsx`) then loads the same data and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                                | Purpose                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `puck.config.tsx`                   | Defines the components, fields, and default props available to Puck and Assembly mode. Add your own components here. |
| `app/puck/[...puckPath]/page.tsx`   | Loads page data for the editor.                                                                                      |
| `app/puck/[...puckPath]/client.tsx` | Renders the editor with the AI copilot, sends prompts to your server, and publishes changes.                         |
| `app/[...puckPath]/page.tsx`        | Loads and renders published pages.                                                                                   |
| `app/api/pages/route.ts`            | Saves published pages.                                                                                               |
| `app/api/puck/[...all]/route.ts`    | Handles requests from the AI plugin and configures AI generation.                                                    |
| `proxy.ts`                          | Routes URLs ending in `/edit` to `/puck/[...puckPath]/page.tsx`.                                                     |
| `lib/get-page.ts`                   | Reads page data from `database.json`. Replace this with your own data fetching logic.                                |
| `database.json`                     | Acts as a local database. Replace this with your own database solution.                                              |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit`, `/api/pages`, and `/api/puck` routes are public by default. Add authentication, authorization, and rate limits to protect page data and AI usage.
- **Add your component library.** Replace the example `HeadingBlock` in `puck.config.tsx` with the components and fields your users need.
- **Set your business context.** Replace the example Google context in `app/api/puck/[...all]/route.ts` with clear information about your product, audience, and content rules.
- **Use a real database.** Replace `database.json` in `lib/get-page.ts` and `app/api/pages/route.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a rendering strategy.** `app/[...puckPath]/page.tsx` uses `force-static`. Remove it if a page needs request-time data such as headers, cookies, or user sessions.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck AI documentation](https://puckeditor.com/docs/ai/overview)
- [Getting started with Puck AI](https://puckeditor.com/docs/ai/getting-started)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
