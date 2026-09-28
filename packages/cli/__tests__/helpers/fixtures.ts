import type { Tree } from "./harness";

const pkg = (data: Record<string, unknown>) =>
  JSON.stringify(data, null, 2) + "\n";

const nextTsconfig = pkg({
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    strict: true,
    module: "esnext",
    moduleResolution: "bundler",
    jsx: "preserve",
    paths: { "@/*": ["./*"] },
  },
});

const layout = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

const home = `export default function Home() {
  return <main>Hello</main>;
}
`;

/** What `create-next-app --app --ts` produces, minus assets */
export const nextMinimal = (
  overrides: { next?: string; name?: string } = {}
): Tree => ({
  "package.json": pkg({
    name: overrides.name ?? "next-minimal",
    private: true,
    scripts: { dev: "next dev", build: "next build" },
    dependencies: {
      next: overrides.next ?? "^16.2.0",
      react: "^19.2.0",
      "react-dom": "^19.2.0",
    },
    devDependencies: { typescript: "^5", "@types/react": "^19" },
  }),
  "package-lock.json": "{}\n",
  "tsconfig.json": nextTsconfig,
  "next.config.ts": "export default {};\n",
  ".gitignore": "/node_modules\n/.next/\n.env*\n",
  "app/layout.tsx": layout,
  "app/page.tsx": home,
});

/** A vinext App Router app, as `vinext init` leaves a migrated create-next-app */
export const vinextMinimal = (
  overrides: { withNext?: boolean; middleware?: boolean } = {}
): Tree => ({
  "package.json": pkg({
    name: "vinext-minimal",
    private: true,
    type: "module",
    scripts: { dev: "vinext dev", build: "vinext build" },
    dependencies: {
      ...(overrides.withNext ? { next: "^16.2.0" } : {}),
      react: "^19.2.6",
      "react-dom": "^19.2.6",
      "react-server-dom-webpack": "^19.2.6",
      vinext: "^1.0.0",
    },
    devDependencies: {
      typescript: "^5",
      "@types/react": "^19",
      "@vitejs/plugin-rsc": "^0.5.34",
      vite: "^8.0.0",
    },
  }),
  "package-lock.json": "{}\n",
  "tsconfig.json": nextTsconfig,
  "vite.config.ts": `import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({ plugins: [vinext()] });
`,
  ".gitignore": "/node_modules\n/dist/\n.env*\n",
  "app/layout.tsx": layout,
  "app/page.tsx": home,
  ...(overrides.middleware
    ? { "middleware.ts": "export function middleware() {}\n" }
    : {}),
});

export const nextSrc = (): Tree => {
  const tree = nextMinimal({ name: "next-src" });
  delete tree["app/layout.tsx"];
  delete tree["app/page.tsx"];
  return { ...tree, "src/app/layout.tsx": layout, "src/app/page.tsx": home };
};

export const nextPages = (): Tree => {
  const tree = nextMinimal({ name: "next-pages" });
  delete tree["app/layout.tsx"];
  delete tree["app/page.tsx"];
  return { ...tree, "pages/index.tsx": home };
};

export const nextWithMiddleware = (): Tree => ({
  ...nextMinimal({ name: "next-with-middleware" }),
  "middleware.ts": `import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}
`,
});

export const nextDynamicRoot = (): Tree => ({
  ...nextMinimal({ name: "next-dynamic" }),
  "app/[slug]/page.tsx": home,
});

const rrRoot = `import { Links, Meta, Outlet, Scripts } from "react-router";

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
`;

/** What `create-react-router` produces */
export const rrMinimal = (overrides: { name?: string } = {}): Tree => ({
  "package.json": pkg({
    name: overrides.name ?? "rr-minimal",
    private: true,
    type: "module",
    scripts: { dev: "react-router dev", build: "react-router build" },
    dependencies: {
      "@react-router/node": "^7.9.2",
      "@react-router/serve": "^7.9.2",
      react: "^19.1.1",
      "react-dom": "^19.1.1",
      "react-router": "^7.9.2",
    },
    devDependencies: {
      "@react-router/dev": "^7.9.2",
      typescript: "^5.9.2",
      vite: "^7.1.7",
      "vite-tsconfig-paths": "^5.1.4",
    },
  }),
  "package-lock.json": "{}\n",
  "tsconfig.json": pkg({
    compilerOptions: {
      strict: true,
      jsx: "react-jsx",
      paths: { "~/*": ["./app/*"] },
    },
  }),
  "react-router.config.ts": `import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
} satisfies Config;
`,
  "vite.config.ts": `import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
});
`,
  ".gitignore": ".DS_Store\n/node_modules/\n/.react-router/\n/build/\n",
  "app/root.tsx": rrRoot,
  "app/routes.ts": `import { type RouteConfig, index } from "@react-router/dev/routes";

export default [index("routes/home.tsx")] satisfies RouteConfig;
`,
  "app/routes/home.tsx": home,
});

export const viteSpa = (): Tree => ({
  "package.json": pkg({
    name: "vite-spa",
    dependencies: { react: "^19", "react-dom": "^19" },
    devDependencies: { vite: "^7" },
  }),
  "tsconfig.json": "{}\n",
  "src/main.tsx": home,
});

const prefixed = (prefix: string, tree: Tree): Tree =>
  Object.fromEntries(
    Object.entries(tree).map(([k, v]) => [`${prefix}/${k}`, v])
  );

const withoutLockfile = (tree: Tree) => {
  const { ["package-lock.json"]: _, ...rest } = tree;
  void _;
  return rest;
};

export const pnpmMonorepo = (
  apps: ("web" | "admin")[] = ["web", "admin"]
): Tree => ({
  "package.json": pkg({ name: "mono", private: true }),
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*\n",
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  ".gitignore": "node_modules\n.env*.local\n",
  "packages/ui/package.json": pkg({ name: "@mono/ui", private: true }),
  ...(apps.includes("web")
    ? prefixed("apps/web", withoutLockfile(nextMinimal({ name: "web" })))
    : {}),
  ...(apps.includes("admin")
    ? prefixed("apps/admin", withoutLockfile(rrMinimal({ name: "admin" })))
    : {}),
});

export const packageJsonMonorepo = (lockfile: string): Tree => ({
  "package.json": pkg({ name: "mono", private: true, workspaces: ["apps/*"] }),
  [lockfile]: lockfile.endsWith(".json") ? "{}\n" : "\n",
  ...prefixed("apps/web", withoutLockfile(nextMinimal({ name: "web" }))),
});

export const emptyPnpmMonorepo = (): Tree => ({
  "package.json": pkg({ name: "mono", private: true }),
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  "apps/.gitkeep": "",
});

/** What `tanstack create --blank` produces, minus assets */
export const tanstackMinimal = (
  overrides: { srcDirectory?: string } = {}
): Tree => {
  const src = overrides.srcDirectory ?? "src";
  const plugin = overrides.srcDirectory
    ? `tanstackStart({ srcDirectory: '${overrides.srcDirectory}' })`
    : "tanstackStart()";
  return {
    "package.json": pkg({
      name: "tanstack-minimal",
      private: true,
      type: "module",
      scripts: { dev: "vite dev --port 3000", build: "vite build" },
      dependencies: {
        "@tanstack/react-router": "latest",
        "@tanstack/react-start": "latest",
        react: "^19.2.0",
        "react-dom": "^19.2.0",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^6.0.1",
        typescript: "^6.0.2",
        vite: "^8.0.0",
      },
    }),
    "package-lock.json": "{}\n",
    "tsconfig.json": pkg({
      include: ["**/*.ts", "**/*.tsx"],
      compilerOptions: {
        jsx: "react-jsx",
        paths: { "#/*": [`./${src}/*`], "@/*": [`./${src}/*`] },
        moduleResolution: "bundler",
        verbatimModuleSyntax: true,
        strict: true,
      },
    }),
    "vite.config.ts": `import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [${plugin}, viteReact()],
})

export default config
`,
    ".gitignore": "node_modules\ndist\n*.local\n.env\n.tanstack\n.output\n",
    [`${src}/router.tsx`]: `import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({ routeTree })
}
`,
    [`${src}/routeTree.gen.ts`]:
      "// This file was automatically generated by TanStack Router.\n",
    [`${src}/routes/__root.tsx`]: `import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({ shellComponent: RootDocument })

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
`,
    [`${src}/routes/index.tsx`]: `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <main>Hello</main>
}
`,
  };
};

const HONO_NODE_ENTRY = `import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(\`Server is running on http://localhost:\${info.port}\`)
})
`;

/** What `create-hono --template nodejs|bun|cloudflare-workers` produces */
export const honoMinimal = (
  runtime: "node" | "bun" | "workers" = "node"
): Tree => ({
  "package.json": pkg({
    name: "hono-minimal",
    type: "module",
    scripts: {
      dev:
        runtime === "node"
          ? "tsx watch src/index.ts"
          : runtime === "bun"
          ? "bun run --hot src/index.ts"
          : "wrangler dev",
    },
    dependencies: {
      ...(runtime === "node" ? { "@hono/node-server": "^2.1.1" } : {}),
      hono: "^4.13.9",
    },
    devDependencies: {
      ...(runtime === "workers" ? { wrangler: "^4.0.0" } : {}),
      ...(runtime === "node" ? { tsx: "^4.23.0" } : {}),
      typescript: "^5.9.3",
    },
  }),
  "package-lock.json": "{}\n",
  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ESNext",
    "module": ${runtime === "node" ? '"NodeNext"' : '"ESNext"'},
    // Comments are allowed in tsconfig.json
    "strict": true,
  },
}
`,
  ".gitignore": "node_modules/\n.env\n",
  "src/index.ts":
    runtime === "node"
      ? HONO_NODE_ENTRY
      : `import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export default app
`,
});

/** A TypeScript Express 5 server with a global JSON body parser */
export const expressMinimal = (
  overrides: { entry?: string | null } = {}
): Tree => {
  const entry =
    overrides.entry === undefined ? "src/index.ts" : overrides.entry;
  return {
    "package.json": pkg({
      name: "express-minimal",
      type: "module",
      scripts: { dev: "tsx watch src/index.ts", start: "node dist/index.js" },
      dependencies: { express: "^5.2.1" },
      devDependencies: {
        "@types/express": "^5.0.3",
        tsx: "^4.23.0",
        typescript: "^5.9.3",
      },
    }),
    "package-lock.json": "{}\n",
    "tsconfig.json": pkg({
      compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" },
    }),
    ".gitignore": "node_modules\n.env*\n",
    ...(entry
      ? {
          [entry]: `import express from "express";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello Express!");
});

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
});
`,
        }
      : {}),
  };
};

/** What `create-vite --template react-ts` produces, formatted like the recipes */
export const viteMinimal = (): Tree => ({
  "package.json": pkg({
    name: "vite-minimal",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc -b && vite build",
      preview: "vite preview",
    },
    dependencies: { react: "^19.2.8", "react-dom": "^19.2.8" },
    devDependencies: {
      "@types/react": "^19.2.18",
      "@vitejs/plugin-react": "^6.1.1",
      typescript: "~6.0.2",
      vite: "^8.3.0",
    },
  }),
  "package-lock.json": "{}\n",
  "tsconfig.json": pkg({
    files: [],
    references: [
      { path: "./tsconfig.app.json" },
      { path: "./tsconfig.node.json" },
    ],
  }),
  "index.html": `<!doctype html>
<html lang="en">
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  ".gitignore": "node_modules\ndist\n*.local\n",
  "vite.config.ts": `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
});
`,
  "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  "src/App.tsx": `export default function App() {
  return <h1>Hello Vite</h1>;
}
`,
});

/** What `create astro --template minimal` produces, optionally after `astro add react node` */
export const astroMinimal = (
  overrides: { withAdapter?: boolean } = {}
): Tree => ({
  "package.json": pkg({
    name: "astro-minimal",
    type: "module",
    scripts: { dev: "astro dev", build: "astro build", astro: "astro" },
    dependencies: {
      astro: "^7.3.5",
      ...(overrides.withAdapter
        ? {
            "@astrojs/node": "^11.1.6",
            "@astrojs/react": "^7.0.0",
            react: "^19.2.0",
            "react-dom": "^19.2.0",
          }
        : {}),
    },
  }),
  "package-lock.json": "{}\n",
  "tsconfig.json": pkg({
    extends: "astro/tsconfigs/strict",
    include: [".astro/types.d.ts", "**/*"],
    exclude: ["dist"],
  }),
  ".gitignore": "dist/\n.astro/\nnode_modules/\n.env\n",
  "astro.config.mjs": overrides.withAdapter
    ? `// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  adapter: node({
    mode: 'standalone'
  })
});
`
    : `// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({});
`,
  "src/pages/index.astro": "---\n---\n\n<h1>Astro</h1>\n",
});
