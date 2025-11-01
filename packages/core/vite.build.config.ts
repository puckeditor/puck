import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { libInjectCss } from "vite-plugin-lib-inject-css";

export default defineConfig({
  plugins: [react(), libInjectCss()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "bundle/index.ts"),
      name: "Puck",
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      output: {
        format: "es",
        interop: "esModule",
        sourcemap: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") return "index.css";
          return assetInfo.name || "";
        },
        // Critical: Use ESM globals, avoid CJS
        generatedCode: {
          constBindings: true,
        },
      },
    },
    minify: false,
    outDir: "dist-vite",
    emptyOutDir: true,
    cssCodeSplit: false,
    cssMinify: false,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
