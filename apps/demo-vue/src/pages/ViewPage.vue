<script setup lang="ts">
import { Render } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config } from "../puck/config";
import { loadData } from "../puck/data";

// No `app` prop needed: bridged components inherit this app's context (Pinia,
// router, …) by default.
const data = loadData();
</script>

<template>
  <div class="view">
    <nav class="view-nav">
      <strong>Published page</strong>
      <router-link to="/edit">Open editor →</router-link>
    </nav>
    <Render :config="config" :data="data" />
  </div>
</template>

<style scoped>
.view-nav {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #e2e8f0;
}
</style>
