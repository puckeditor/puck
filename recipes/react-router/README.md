# `react-router` recipe

[Puck](https://puckeditor.com) is the visual editor for React. This app wires Puck into **React Router v7** (framework mode) so you can visually edit _any_ route — just add `/edit` to the URL — and serves the published pages from the same route.

> **New to Puck?** Read [What is Puck?](https://puckeditor.com/docs) and the [Getting Started guide](https://puckeditor.com/docs/getting-started) first. In short, Puck has three pieces: a [**config**](https://puckeditor.com/docs/api-reference/configuration/config) that describes your components, the [**`<Puck>`**](https://puckeditor.com/docs/api-reference/components/puck) editor, and [**`<Render>`**](https://puckeditor.com/docs/api-reference/components/render) for displaying a saved page. This app connects those three to React Router and a database.

## What this app demonstrates

- React Router v7 (framework mode) integration
- Editing any route by appending `/edit` (even routes that don't exist yet)
- A single [splat route](https://reactrouter.com/start/framework/routing#splats) that both renders published pages and hosts the editor
- A JSON file standing in for a database

## Getting started

Start the dev server:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the home page, then add `/edit` to edit it: [http://localhost:5173/edit](http://localhost:5173/edit).

This works for **any route, even ones that don't exist yet**:

1. Visit [http://localhost:5173/hello/world](http://localhost:5173/hello/world) — you'll get a 404.
2. Add `/edit` ([http://localhost:5173/hello/world/edit](http://localhost:5173/hello/world/edit)) to open the editor for that path.
3. Build a page, press **Publish**, then visit the original URL to see it live.

> This app was scaffolded with `create-puck-app`. To create another, run `npx create-puck-app my-app`.

## How it works

The table below maps each key file to what it does and the relevant Puck docs. **To add your own components, start with `puck.config.tsx`.**

| File | Responsibility |
| --- | --- |
| `puck.config.tsx` | The [Puck config](https://puckeditor.com/docs/api-reference/configuration/config): the [components](https://puckeditor.com/docs/api-reference/configuration/component-config) users can drop onto a page, their [fields](https://puckeditor.com/docs/api-reference/fields/text), default props, and how each renders. |
| `app/routes.ts` | Registers the routes: the home page and a catch-all [splat route](https://reactrouter.com/start/framework/routing#splats) (`*`) that handles every other path. |
| `app/routes/puck-splat.tsx` | **The heart of the app.** Its [`loader`](https://reactrouter.com/start/framework/route-module#loader) reads the page's [`Data`](https://puckeditor.com/docs/api-reference/data-model/data) (or a 404), its [`action`](https://reactrouter.com/start/framework/route-module#action) saves published pages, and the component renders either the [`<Puck>`](https://puckeditor.com/docs/api-reference/components/puck) editor (on `/edit`) or [`<Render>`](https://puckeditor.com/docs/api-reference/components/render) (for visitors). |
| `app/lib/resolve-puck-path.server.ts` | Detects whether a URL ends in `/edit` and returns the underlying page path. This is what lets you edit any URL by appending `/edit`. |
| `app/routes/_index.tsx` | Renders the home page (`/`) with `<Render>`. |
| `app/components/puck-render.tsx` | Thin wrapper around [`<Render>`](https://puckeditor.com/docs/api-reference/components/render). |
| `app/lib/pages.server.ts` | Reads and writes page `Data` in `database.json`. |

## Adapting this app for production

- ⚠️ **Add authentication.** The `/edit` routes are **public** out of the box. Protect the [`action`](https://reactrouter.com/start/framework/route-module#action) (which saves pages) in `app/routes/puck-splat.tsx`. **Without this, anyone can edit and publish your pages.**
- **Connect a real database.** Replace the `database.json` reads and writes in `app/lib/pages.server.ts`.
- **Build your components.** Extend `puck.config.tsx` — see [Component Configuration](https://puckeditor.com/docs/integrating-puck/component-configuration).

## Learn more

- [Puck documentation](https://puckeditor.com/docs) · [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck on GitHub](https://github.com/puckeditor/puck) · [Discord](https://discord.gg/D9e4E3MQVZ)
