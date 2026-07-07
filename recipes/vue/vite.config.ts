import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // @puckeditor/vue keeps `vue` external, so dedupe to guarantee a single Vue
  // instance shared across the bridge.
  resolve: { dedupe: ["vue"] },
});
