import { ensureConfigEntry, ensurePlugin } from "../config-object";
import { ensureRootWrapped } from "../react-root";

const codeOf = (result: { status: string; code?: string }) =>
  result.status === "inserted" ? result.code : result.status;

// What `create-vite --template react-ts` produces
const VITE_CONFIG = `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
`;

const MAIN = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`;

const DEV_SERVER = {
  importName: "devServer",
  source: "@hono/vite-dev-server",
  call: 'devServer({ entry: "server/index.ts", exclude: [/^(?!\\/api\\/).*/] })',
};

describe("ensurePlugin", () => {
  it("reflows a single-line plugins array that would get too long", () => {
    expect(codeOf(ensurePlugin(VITE_CONFIG, "vite.config.ts", DEV_SERVER)))
      .toBe(`import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devServer({ entry: "server/index.ts", exclude: [/^(?!\\/api\\/).*/] }),
  ],
})
`);
  });

  it("keeps short additions on one line and is idempotent", () => {
    const once = codeOf(
      ensurePlugin(VITE_CONFIG, "vite.config.ts", {
        importName: "puck",
        source: "puck",
        call: "puck()",
      })
    ) as string;
    expect(once).toContain("plugins: [react(), puck()],");
    expect(
      ensurePlugin(once, "vite.config.ts", {
        importName: "puck",
        source: "puck",
        call: "puck()",
      }).status
    ).toBe("exists");
  });
});

describe("ensureConfigEntry", () => {
  it("creates nested objects for a proxy entry, matching quotes", () => {
    expect(
      codeOf(
        ensureConfigEntry(
          VITE_CONFIG,
          "vite.config.ts",
          ["server", "proxy"],
          "/api",
          "http://localhost:3000"
        )
      )
    ).toBe(`import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
`);
  });

  it("adds to existing objects and never overwrites an entry", () => {
    const code = `export default { server: { port: 5173, proxy: { "/api": "http://x" } } };\n`;
    expect(
      ensureConfigEntry(
        code,
        "vite.config.ts",
        ["server", "proxy"],
        "/api",
        "http://y"
      ).status
    ).toBe("exists");
    expect(
      codeOf(
        ensureConfigEntry(
          `export default { server: { port: 5173 } };\n`,
          "vite.config.ts",
          ["server", "proxy"],
          "/api",
          "http://y"
        )
      )
    ).toBe(
      `export default { server: { port: 5173, proxy: { "/api": "http://y" } } };\n`
    );
  });
});

describe("ensureRootWrapped", () => {
  it("wraps the app inside StrictMode in the create-vite entry", () => {
    expect(
      codeOf(
        ensureRootWrapped(MAIN, "src/main.tsx", {
          component: "PuckRoot",
          source: "./puck/root",
        })
      )
    ).toBe(`import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PuckRoot } from './puck/root'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PuckRoot>
      <App />
    </PuckRoot>
  </StrictMode>,
)
`);
  });

  it("is idempotent and asks for a manual edit without createRoot", () => {
    const opts = { component: "PuckRoot", source: "./puck/root" };
    const once = codeOf(
      ensureRootWrapped(MAIN, "src/main.tsx", opts)
    ) as string;
    expect(ensureRootWrapped(once, "src/main.tsx", opts).status).toBe("exists");
    expect(
      ensureRootWrapped(`export const x = 1;\n`, "src/main.tsx", opts).status
    ).toBe("manual");
  });
});
