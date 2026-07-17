# Puck AI + Next.js recipe

[Puck](https://puckeditor.com) is the open-source visual editor for React. Register the UI components you need in the [config object](https://puckeditor.com/docs/integrating-puck/component-configuration), and Puck makes them available inside a drag-and-drop page builder.

[Puck AI](https://puckeditor.com/docs/ai/overview) builds on the same principles to generate UI at scale. It can assemble registered components or create new ones using your [rules](https://puckeditor.com/docs/ai/ai-configuration), [external data](https://puckeditor.com/docs/ai/tools), and [brand context](https://puckeditor.com/docs/ai/business-context). You can use it as a [copilot inside the editor](https://puckeditor.com/docs/ai/getting-started#setup-the-ai-plugin) or programmatically through [headless APIs](https://puckeditor.com/docs/ai/headless-generation).

This recipe connects Puck and Puck AI to the [Next.js App Router](https://nextjs.org/docs/app), so you can use the copilot to create, edit, or generate pages for any route in this app.

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

Users can switch between Assembly and Design modes from the copilot. You can decide whether the Design mode switch is visible using [`designMode.visible`](https://puckeditor.com/docs/api-reference/ai/ai-plugin/create-ai-plugin#designmode) in `createAiPlugin` (`app/puck/[...puckPath]/client.tsx`).

To control whether Design mode is allowed at all, use [`ai.designMode.allowed`](https://puckeditor.com/docs/api-reference/ai/cloud-client/puck-handler#aidesignmode) in `puckHandler` (`app/api/puck/[...all]/route.ts`). Setting `allowed` to `false` blocks Design mode requests from the client, even if the switch is visible.

## Run the recipe

### 1. Add a Puck API key

Puck AI connects to [Puck Cloud](https://cloud.puckeditor.com). Start by creating an account, [generating an API key](https://cloud.puckeditor.com/api-keys), and adding it to a `.env.local` file:

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

Navigate to [http://localhost:3000/edit](http://localhost:3000/edit), click the **AI** button in the left sidebar, enable Design mode, enter a prompt, and press Enter.

### 4. Publish the page

Once your page is ready, select **Publish** in the header to save the result, then navigate to [http://localhost:3000](http://localhost:3000) to view the published page.

You can also create a page at any path by navigating to `/your/path/edit` and publishing it. The route `/your/path` will render the page.

## How it works

When a URL ends in `/edit`, [`proxy.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) sends the request to the Puck editor route (`app/puck/[...puckPath]/page.tsx`). The editor loads the saved page, or starts with an empty page if the path is new.

When using the copilot, the AI plugin sends prompts to the `/api/puck` endpoint (`app/api/puck/[...all]/route.ts`). `puckHandler` adds your server-side settings and API key, then forwards the request to the Puck Cloud and streams the response back to the plugin in your browser.

Selecting **Publish** sends the page data to the `/api/pages` endpoint (`app/api/pages/route.ts`). The handler writes the JSON to `database.json` and clears the Next.js cache for that page. The catch-all route (`app/[...puckPath]/page.tsx`) then loads the same data and renders it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render).

The table below shows the files that implement this flow.

| File                                | Purpose                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `puck.config.tsx`                   | Defines the components, fields, and default props available to Puck and Assembly mode. Add your own components here. |
| `app/puck/[...puckPath]/page.tsx`   | Loads page data for the editor.                                                                                      |
| `app/puck/[...puckPath]/client.tsx` | Renders the editor with the AI copilot, sends prompts to your server, and publishes changes.                         |
| `app/[...puckPath]/page.tsx`        | Loads and renders published pages.                                                                                   |
| `app/api/pages/route.ts`            | Saves published pages.                                                                                               |
| `app/api/puck/[...all]/route.ts`    | Sends requests to the Puck Cloud and configures AI generation.                                                       |
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
