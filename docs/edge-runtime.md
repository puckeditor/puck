# Edge Runtime Support

Puck now provides an edge runtime-compatible build via the `@measured/puck/edge` export.

## What it is

A pure ESM build of Puck with all dependencies bundled, specifically designed for edge runtimes like:
- Shopify Oxygen (Cloudflare Workers)
- Vercel Edge Runtime
- Cloudflare Workers
- Deno Deploy

## Why it is needed

The default tsup build includes CommonJS interop helpers (`__require`) that fail in edge runtimes with the error:
```
Error: Dynamic require of "..." is not supported
```

Edge runtimes have stricter module requirements and cannot execute CommonJS compatibility code.

## How it works

The `/edge` export uses **Vite** to create a pure ESM bundle:
- All dependencies bundled into a single `.mjs` file
- Zero CommonJS interop code
- CSS Modules fully supported
- React left as external peer dependency

**Build output:**
- `dist-vite/index.mjs` - Pure ESM bundle (~611KB)
- `dist-vite/index.css` - Bundled styles
- `dist-vite/index.d.mts` - TypeScript definitions

## Usage

### For Edge Runtimes (Oxygen, Vercel Edge, etc.)

```tsx
import { Puck } from '@measured/puck/edge';
import '@measured/puck/edge/puck.css';

export default function Editor() {
  return <Puck config={config} data={data} />;
}
```

### For Node.js/Standard Environments

Continue using the default export:

```tsx
import { Puck } from '@measured/puck';
import '@measured/puck/puck.css';
```

## Development

### Build the edge export

```bash
yarn build:edge
```

This creates the `dist-vite` directory with the bundled output.

## Technical Details

**Vite Configuration:**
- Library mode with pure ESM output
- `interop: 'esModule'` - No CJS compatibility code
- All deps bundled except React peer dependency
- CSS Modules preserved with proper token generation

**Dependencies:**
- `vite` - Build tool
- `@vitejs/plugin-react` - React JSX support
- `vite-plugin-lib-inject-css` - CSS bundling

## Verification

The edge build has been verified to:
- ✅ Contain zero `require()` calls
- ✅ Work in Shopify Oxygen runtime
- ✅ Preserve CSS Modules with proper tokens
- ✅ Match default build size (~600KB)

## Publishing

Both builds are published together:
- `dist/` - Default build (Node.js, CJS/ESM dual)
- `dist-vite/` - Edge build (pure ESM)

Users import whichever they need via package exports.