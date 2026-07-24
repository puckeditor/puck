# Puck AI + React Router recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React. Register the UI components you need in the [config object](https://puckeditor.com/docs/integrating-puck/component-configuration), and Puck makes them available inside a drag-and-drop page builder.

[Puck AI](https://puckeditor.com/docs/ai/overview) builds on the same principles to generate UI at scale. It can assemble registered components or create new ones using your [rules](https://puckeditor.com/docs/ai/ai-configuration), [external data](https://puckeditor.com/docs/ai/tools), and [brand context](https://puckeditor.com/docs/ai/business-context). You can use it as a [copilot inside the editor](https://puckeditor.com/docs/ai/getting-started#setup-the-ai-plugin) or programmatically through [headless APIs](https://puckeditor.com/docs/ai/headless-generation).

This recipe connects Puck and Puck AI to [React Router](https://reactrouter.com) in framework mode, so you can use the copilot to create, edit, or generate pages for any route in this app.

## New to Puck?

Read [What is Puck?](https://puckeditor.com/docs) and the [Getting Started guide](https://puckeditor.com/docs/getting-started) first.

In short, Puck has three main pieces:

- A [config](https://puckeditor.com/docs/api-reference/configuration/config) object that defines which components can be used to build pages.
- The [`<Puck>`](https://puckeditor.com/docs/api-reference/components/puck) component that renders the editor and exports the [page as JSON](https://puckeditor.com/docs/api-reference/data-model/data).
- The [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) component that renders the exported JSON as a page.

## Puck AI modes

Puck AI can build pages in two ways:

- **Assembly mode** builds pages from the components already registered with Puck.
- **Design mode** can generate new components when needed and reuse existing ones. Generated components are saved in the page data and can be managed in the `Blocks` tab.

Users can switch between Assembly and Design modes from the copilot. You can decide whether the Design mode switch is visible using [`designMode.visible`](https://puckeditor.com/docs/api-reference/ai/ai-plugin/create-ai-plugin#designmode) in `createAiPlugin` (`app/routes/puck-splat.tsx`).

To control whether Design mode is allowed at all, use [`ai.designMode.allowed`](https://puckeditor.com/docs/api-reference/ai/cloud-client/puck-handler#aidesignmode) in `puckHandler` (`app/routes/api.puck.ts`). Setting `allowed` to `false` blocks Design mode requests from the client, even if the switch is visible.

## Run the recipe

### 1. Add a Puck API key

Puck AI connects to [Puck Cloud](https://cloud.puckeditor.com). Start by creating an account, [generating an API key](https://cloud.puckeditor.com/api-keys), and adding it to an `.env.local` file:

```sh
PUCK_API_KEY=your-api-key
```

### 2. Start the development server

Run:

```sh
npm run dev
```

Once the server is running, navigate to [http://localhost:5173](http://localhost:5173) to view the home page, or [http://localhost:5173/edit](http://localhost:5173/edit) to edit it with Puck.

### 3. Create a page with Puck AI

Navigate to [http://localhost:5173/edit](http://localhost:5173/edit), click the **AI** button in the left sidebar, enable Design mode, enter a prompt, and press Enter.

### 4. Publish the page

Once your page is ready, select **Publish** in the header to save the result, then navigate to [http://localhost:5173](http://localhost:5173) to view the published page.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it. The route `/your/path` will render the page.

## How it works

When a URL ends in `/edit`, `resolvePuckPath` (`app/lib/resolve-puck-path.server.ts`) returns the path of the page being edited. The loader in `app/routes/puck-splat.tsx` loads the saved page, or starts with an empty page if the path is new.

When using the copilot, the AI plugin sends prompts to the `/api/puck` endpoint (`app/routes/api.puck.ts`). `puckHandler` adds your server-side settings and API key, then forwards the request to the Puck Cloud and streams the response back to the plugin in your browser.

Selecting **Publish** sends the page data to the action in `app/routes/puck-splat.tsx`. The action writes the JSON to `database.json`. The route then loads the same data and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                                  | Purpose                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `puck.config.tsx`                     | Defines the components, fields, and default props available to Puck and Assembly mode. Add your own components here. |
| `app/routes.ts`                       | Registers the home page, Puck AI API, and catch-all page route.                                                      |
| `app/routes/puck-splat.tsx`           | Loads and saves page data, then renders the editor or published page.                                                |
| `app/routes/api.puck.ts`              | Sends requests to the Puck Cloud and configures AI generation.                                                       |
| `app/routes/_index.tsx`               | Loads and renders the home page.                                                                                     |
| `app/lib/resolve-puck-path.server.ts` | Maps an `/edit` URL to the path of the page being edited.                                                            |
| `app/lib/pages.server.ts`             | Reads and writes page data in `database.json`. Replace this with your own data fetching and saving logic.            |
| `app/components/puck-render.tsx`      | Renders saved page data with `<Render>`.                                                                             |
| `database.json`                       | Acts as a local database. Replace this with your own database solution.                                              |

## Before deploying to production

Before deploying this recipe, make sure to:

- **Protect the editor and APIs.** The `/edit` routes, publish action, and `/api/puck` route are public by default. Add authentication, authorization, and rate limits to protect page data and AI usage.
- **Add your component library.** Replace the example `HeadingBlock` in `puck.config.tsx` with the components and fields your users need.
- **Set your business context.** Replace the example Google context in `app/routes/api.puck.ts` with clear information about your product, audience, and content rules.
- **Use a real database.** Replace `database.json` and the functions in `app/lib/pages.server.ts`. Local files are not reliable across server instances or serverless deployments.
- **Choose a deployment strategy.** This recipe uses server-side rendering, loaders, and actions. Deploy it to a React Router-compatible server runtime.

## Learn more

- [Puck documentation](https://puckeditor.com/docs)
- [Getting started with Puck](https://puckeditor.com/docs/getting-started)
- [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck AI documentation](https://puckeditor.com/docs/ai/overview)
- [Getting started with Puck AI](https://puckeditor.com/docs/ai/getting-started)
- [React Router framework mode](https://reactrouter.com/start/framework/installation)
- [Puck Discord](https://discord.gg/D9e4E3MQVZ)
