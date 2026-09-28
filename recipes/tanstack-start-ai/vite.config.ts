import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tanstackStart(), viteReact()],
  optimizeDeps: {
    include: ["@puckeditor/core", "@puckeditor/plugin-ai"],
  },
});

export default config;
