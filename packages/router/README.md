# @puckeditor/router

Pages as code, editable in production.

Define pages in `src/`, commit them, review them, type-check them — and still let a
non-technical user edit any of them in the Puck editor. The first publish forks the page
into your store; the store wins from then on.

> **Status:** the framework-agnostic core (this entry) is implemented. The `/next`,
> `/next/client` and `/stores` entries are not built yet.

## Ownership

Every page is fully editable. Ownership is copy-on-write:

1. A user page in the store beats a code-defined page, which beats a 404.
2. Code pages are seeds. The first save forks the page into the store.
3. Later edits to an already-forked source file never silently merge. The mismatch is
   reported as `drift` so the editor can surface it.

## Usage

```tsx
// src/pages/pricing.tsx
import { definePage } from "@puckeditor/router";
import config from "../../puck.config";

export default definePage(config, {
  path: "/pricing",
  data: {
    root: { props: { title: "Pricing" } },
    content: [{ type: "HeadingBlock", props: { title: "Simple pricing" } }],
  },
});
```

`data` is typed against your config, so component names and their props are checked at
build time.

Collect them in a barrel:

```ts
// puck.pages.ts
import home from "./src/pages/home";
import pricing from "./src/pages/pricing";

export default [home, pricing];
```

Then resolve a request:

```ts
import { resolvePage } from "@puckeditor/router";

const resolved = await resolvePage({ pathname, pages, store });

if (!resolved) return notFound();
```

## API

| Export | Purpose |
| --- | --- |
| `definePage(config, { path, data })` | Define a page in code. Returns a `PageSource`. |
| `resolvePage({ pathname, pages, store, mode? })` | Store → code → `null`. The whole algorithm. |
| `listPagePaths({ pages, store })` | Every servable path — what `generateStaticParams` needs. |
| `resolvePuckPath(path)` | Canonicalises a path and detects the `/edit` suffix. |
| `indexPages(pages)` | Indexes a barrel array by path. Memoised; throws on duplicates. |
| `emptyPageData()` | A fresh empty page shell. |
| `sourceHash(value)` / `stableStringify(value)` | Stable, key-order-independent hashing. |

### `mode`

`resolvePage` normally infers edit mode from an `/edit` suffix. Next.js rewrites
`/pricing/edit` to `/puck/pricing` in the proxy, so by the time the editor route runs the
suffix is gone — that route must pass `mode: "edit"` explicitly, or a brand-new page 404s
instead of opening an empty editor.

### Stores

```ts
type PageStore = {
  get(path: string): Promise<StoredPage | null>;
  set(path: string, page: StoredPage): Promise<void>;
  list(): Promise<string[]>;
};
```

Anything matching this shape works. The store never sees code pages — `resolvePage` owns
the fallback, so forking is implicit: the first `set()` materialises the row.

## Notes

- This entry imports no framework and touches no filesystem. It is safe from a server
  component, an edge runtime, or a plain Node script.
- Paths are canonicalised through `URL`, so `/pricing`, `/pricing/`, `/pricing/edit` and
  `/%C3%BCber` all resolve to one store key, and `..` is resolved away rather than into a
  key outside the page namespace.
- `drift` is detected and surfaced, never resolved. There is no merge, adopt or diff.
