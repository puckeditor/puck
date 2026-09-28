// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  adapter: node({
    mode: "standalone",
  }),

  // Pre-bundle Puck together, so the AI plugin and the editor share one copy
  vite: {
    optimizeDeps: {
      include: ["@puckeditor/core", "@puckeditor/plugin-ai"],
    },
  },
});
