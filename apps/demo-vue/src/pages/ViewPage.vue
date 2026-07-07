<script setup lang="ts">
import { createApp } from "vue";
import { Render } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config } from "../puck/config";
import { loadData } from "../puck/data";
import { pinia } from "../store";

const bridgeApp = createApp({});
bridgeApp.use(pinia);

const data = loadData();
</script>

<template>
  <div class="view">
    <nav class="view-nav">
      <strong>Published page</strong>
      <router-link to="/edit">Open editor →</router-link>
    </nav>
    <Render :config="config" :data="data" :app="bridgeApp" />
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
