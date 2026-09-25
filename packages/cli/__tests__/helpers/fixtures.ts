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
