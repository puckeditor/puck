# `next` recipe

[Puck](https://puckeditor.com) is the visual editor for React. This app wires Puck into the **Next.js App Router** so you can visually edit _any_ route — just add `/edit` to the URL — and serves the published pages as fast, statically rendered pages.

> **New to Puck?** Read [What is Puck?](https://puckeditor.com/docs) and the [Getting Started guide](https://puckeditor.com/docs/getting-started) first. In short, Puck has three pieces: a [**config**](https://puckeditor.com/docs/api-reference/configuration/config) that describes your components, the [**`<Puck>`**](https://puckeditor.com/docs/api-reference/components/puck) editor, and [**`<Render>`**](https://puckeditor.com/docs/api-reference/components/render) for displaying a saved page. This app connects those three to Next.js routing and a database.

## What this app demonstrates

- Next.js App Router integration
- Editing any route by appending `/edit` (even routes that don't exist yet)
- Statically rendered pages with Incremental Static Regeneration (ISR)
- A JSON file standing in for a database, written through an HTTP API route

## Getting started

Start the dev server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the home page, then add `/edit` to edit it: [http://localhost:3000/edit](http://localhost:3000/edit).

This works for **any route, even ones that don't exist yet**:

1. Visit [http://localhost:3000/hello/world](http://localhost:3000/hello/world) — you'll get a 404.
2. Add `/edit` ([http://localhost:3000/hello/world/edit](http://localhost:3000/hello/world/edit)) to open the editor for that path.
3. Build a page, press **Publish**, then visit the original URL to see it live.

> This app was scaffolded with `create-puck-app`. To create another, run `npx create-puck-app my-app`.

## How it works

The table below maps each key file to what it does and the relevant Puck docs. **To add your own components, start with `puck.config.tsx`.**

| File | Responsibility |
| --- | --- |
| `puck.config.tsx` | The [Puck config](https://puckeditor.com/docs/api-reference/configuration/config): the [components](https://puckeditor.com/docs/api-reference/configuration/component-config) users can drop onto a page, their [fields](https://puckeditor.com/docs/api-reference/fields/text), default props, and how each renders. |
| `app/puck/[...puckPath]/page.tsx` | **Editor entry point (server).** Loads the saved [`Data`](https://puckeditor.com/docs/api-reference/data-model/data) for the path and passes it to the client component. |
| `app/puck/[...puckPath]/client.tsx` | **Editor entry point (client).** Renders the [`<Puck>`](https://puckeditor.com/docs/api-reference/components/puck) editor; its [`onPublish`](https://puckeditor.com/docs/api-reference/components/puck#onpublishdata) callback posts the page to the API route. |
| `app/[...puckPath]/page.tsx` | **Public page (server).** Loads the saved page and displays it with [`<Render>`](https://puckeditor.com/docs/api-reference/components/render), or returns a 404. Statically rendered with ISR (`force-static`). |
| `proxy.ts` | The routing "magic". Rewrites `/<path>/edit` to the internal editor route and hides the raw `/puck/*` routes — this is what lets you edit any URL by appending `/edit`. |
| `app/puck/api/route.ts` | **API route.** `POST` saves a published page to the database and revalidates the Next.js cache so the public page updates. |
| `lib/get-page.ts` | Reads a page's `Data` from `database.json`. |

The editor runs on a dynamic route while your published pages stay static, so visitors get fast static pages and editors get a live editor.

## Adapting this app for production

- ⚠️ **Add authentication.** The `/edit` routes are **public** out of the box. Protect the editor's server component (`app/puck/[...puckPath]/page.tsx`) and the API route (`app/puck/api/route.ts`). **Without this, anyone can edit and publish your pages.**
- **Connect a real database.** Replace the `database.json` reads and writes in `lib/get-page.ts` and `app/puck/api/route.ts`.
- **Build your components.** Extend `puck.config.tsx` — see [Component Configuration](https://puckeditor.com/docs/integrating-puck/component-configuration).
- **Static vs. dynamic pages.** Public pages set [`export const dynamic = "force-static"`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic) in `app/[...puckPath]/page.tsx`, which strips headers and cookies. Remove it if you need dynamic rendering.

## Learn more

- [Puck documentation](https://puckeditor.com/docs) · [Integrating Puck](https://puckeditor.com/docs/integrating-puck/component-configuration)
- [Puck on GitHub](https://github.com/puckeditor/puck) · [Discord](https://discord.gg/D9e4E3MQVZ)
