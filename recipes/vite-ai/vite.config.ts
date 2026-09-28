import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devServer({ entry: "server/index.ts", exclude: [/^(?!\/api\/).*/] }),
  ],
  optimizeDeps: {
    include: ["@puckeditor/core", "@puckeditor/plugin-ai"],
  },
});
