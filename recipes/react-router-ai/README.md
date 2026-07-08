# `react-router-ai` recipe

[Puck](https://puckeditor.com) is the visual editor for React, and [Puck AI](https://puckeditor.com/docs/ai/overview) lets you generate pages from a prompt using your own components. This app wires both into **React Router v7** (framework mode) so you can visually edit — or AI-generate — _any_ route by adding `/edit` to the URL, and serves the published pages from the same route.

> **New to Puck?** Read [What is Puck?](https://puckeditor.com/docs) and the [Getting Started guide](https://puckeditor.com/docs/getting-started) first. In short, Puck has three pieces: a [**config**](https://puckeditor.com/docs/api-reference/configuration/config) that describes your components, the [**`<Puck>`**](https://puckeditor.com/docs/api-reference/components/puck) editor, and [**`<Render>`**](https://puckeditor.com/docs/api-reference/components/render) for displaying a saved page. This app connects those three to React Router, a database, and Puck AI.

## What this app demonstrates

- [Puck AI](https://puckeditor.com/docs/ai/overview) integration for generating pages from a prompt
- React Router v7 (framework mode) integration
- Editing any route by appending `/edit` (even routes that don't exist yet)
- A single [splat route](https://reactrouter.com/start/framework/routing#splats) that both renders published pages and hosts the editor
- A JSON file standing in for a database

## Getting started

### 1. Set up Puck AI

Puck AI runs through [Puck Cloud](https://cloud.puckeditor.com). Create an account and [generate an API key](https://puckeditor.com/docs/ai/getting-started#generate-an-api-key), then copy the example env file and add your key:

```sh
cp .env.example .env.local
```

```sh
# .env.local
PUCK_API_KEY=your-api-key
```

### 2. Start the dev server

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the home page, then add `/edit` to edit it: [http://localhost:5173/edit](http://localhost:5173/edit). Select the **AI** button in the left sidebar to generate content with Puck AI.

This works for **any route, even ones that don't exist yet**:

1. Visit [http://localhost:5173/hello/world](http://localhost:5173/hello/world) — you'll get a 404.
2. Add `/edit` ([http://localhost:5173/hello/world/edit](http://localhost:5173/hello/world/edit)) to open the editor for that path.
3. Build (or AI-generate) a page, press **Publish**, then visit the original URL to see it live.

> This app was scaffolded with `create-puck-app`. To create another, run `npx create-puck-app my-app`.

## How it works

The table below maps each key file to what it does and the relevant Puck docs. **To add your own components, start with `puck.config.tsx`.**

| File | Responsibility |
| --- | --- |
| `puck.config.tsx` | The [Puck config](https://puckeditor.com/docs/api-reference/configuration/config): the [components](https://puckeditor.com/docs/api-reference/configuration/component-config) users can drop onto a page, their [fields](https://puckeditor.com/docs/api-reference/fields/text), default props, and how each renders. |
| `app/routes.ts` | Registers the routes: the home page, the Puck AI API route, and a catch-all [splat route](https://reactrouter.com/start/framework/routing#splats) (`*`) that handles every other path. |
| `app/routes/puck-splat.tsx` | **The heart of the app.** Its [`loader`](https://reactrouter.com/start/framework/route-module#loader) reads the page's [`Data`](https://puckeditor.com/docs/api-reference/data-model/data) (or a 404), its [`action`](https://reactrouter.com/start/framework/route-module#action) saves published pages, and the component renders either the [`<Puck>`](https://puckeditor.com/docs/api-reference/components/puck) editor (with the [Puck AI plugin](https://puckeditor.com/docs/ai/overview), on `/edit`) or [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) (for visitors). |
| `app/routes/api.puck.ts` | **Puck AI API route.** Proxies AI requests to Puck Cloud via `puckHandler`. Set your business `context` (what the AI should generate) here. See [Getting Started with Puck AI](https://puckeditor.com/docs/ai/getting-started). |
| `app/lib/resolve-puck-path.server.ts` | Detects whether a URL ends in `/edit` and returns the underlying page path. This is what lets you edit any URL by appending `/edit`. |
| `app/routes/_index.tsx` | Renders the home page (`/`) with `<Render>`. |
| `app/components/puck-render.tsx` | Thin wrapper around [`<Render>`](https://puckeditor.com/docs/api-reference/components/render). |
| `app/lib/pages.server.ts` | Reads and writes page `Data` in `database.json`. |

## Adapting this app for production

- ⚠️ **Add authentication.** The `/edit` routes are **public** out of the box. Protect the [`action`](https://reactrouter.com/start/framework/route-module#action) (which saves pages) in `app/routes/puck-splat.tsx` and the Puck AI route in `app/routes/api.puck.ts`. **Without this, anyone can edit, generate, and publish your pages.**
- **Give the AI context.** Replace the placeholder `context` in `app/routes/api.puck.ts` with a description of your business so generated pages are on-brand.
- **Connect a real database.** Replace the `database.json` reads and writes in `app/lib/pages.server.ts`.
- **Build your components.** Extend `puck.config.tsx` — see [Component Configuration](https://puckeditor.com/docs/integrating-puck/component-configuration).

## Learn more

- [Puck AI documentation](https://puckeditor.com/docs/ai/overview) · [Puck documentation](https://puckeditor.com/docs)
- [Puck on GitHub](https://github.com/puckeditor/puck) · [Discord](https://discord.gg/D9e4E3MQVZ)
