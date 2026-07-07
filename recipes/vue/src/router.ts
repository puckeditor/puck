import { createRouter, createWebHistory } from "vue-router";
import Page from "./pages/Page.vue";
import Editor from "./pages/Editor.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Page },
    { path: "/edit", component: Editor },
  ],
});
