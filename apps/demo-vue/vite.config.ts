import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // The single most important line: @puckeditor/vue keeps `vue` external, so
    // its internal `import "vue"` MUST resolve to the SAME Vue instance as the
    // app — otherwise reactivity, provide/inject and app context break across
    // the bridge.
    dedupe: ["vue"],
  },
});
