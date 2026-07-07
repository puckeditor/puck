import { createRouter, createWebHistory } from "vue-router";
import ViewPage from "./pages/ViewPage.vue";
import EditPage from "./pages/EditPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "view", component: ViewPage },
    { path: "/edit", name: "edit", component: EditPage },
  ],
});
