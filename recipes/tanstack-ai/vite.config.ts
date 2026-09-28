import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { devtools } from "@tanstack/devtools-vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  // Keep the editor and AI plugin on the same Puck instance in the workspace.
  optimizeDeps: {
    include: ["@puckeditor/core"],
  },
  ssr: {
    external: ["@puckeditor/core"],
  },
  plugins: [
    devtools(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "src",
      router: {
        quoteStyle: "double",
        semicolons: true,
      },
    }),
    viteReact(),
  ],
});
