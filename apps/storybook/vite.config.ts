import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@puckeditor/core": fileURLToPath(
        new URL("../../packages/core", import.meta.url)
      ),
      "@puckeditor/storybook-to-puck": fileURLToPath(
        new URL("../../packages/storybook-to-puck", import.meta.url)
      )
    }
  }
});
