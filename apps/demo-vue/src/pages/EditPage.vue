<script setup lang="ts">
import { createApp } from "vue";
import { useRouter } from "vue-router";
import { Puck } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config } from "../puck/config";
import { loadData, saveData } from "../puck/data";
import { pinia } from "../store";

const router = useRouter();

// An unmounted app instance carrying shared plugins (Pinia). Its context is
// threaded into every bridged Vue component so CounterBadge can read the store.
const bridgeApp = createApp({});
bridgeApp.use(pinia);

const initialData = loadData();

function onChange(data: unknown) {
  saveData(data);
}

function onPublish(data: unknown) {
  saveData(data);
  router.push("/");
}

function onReady(getPuck: () => unknown) {
  // The imperative PuckApi accessor.
  (window as any).__getPuck = getPuck;
}
</script>

<template>
  <div class="editor">
    <Puck
      :config="config"
      :data="initialData"
      :app="bridgeApp"
      header-title="Puck + Vue demo"
      @change="onChange"
      @publish="onPublish"
      @ready="onReady"
    />
  </div>
</template>

<style scoped>
.editor {
  height: 100vh;
}
</style>
