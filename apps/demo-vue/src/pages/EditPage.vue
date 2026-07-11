<script setup lang="ts">
import { useRouter } from "vue-router";
import { Puck, type PuckApi } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config } from "../puck/config";
import { loadData, saveData } from "../puck/data";

const router = useRouter();

// No `app` prop needed: bridged components inherit this app's context (Pinia,
// router, …) by default, so CounterBadge can read the store directly.
const initialData = loadData();

function onChange(data: unknown) {
  saveData(data);
}

function onPublish(data: unknown) {
  saveData(data);
  router.push("/");
}

function onReady(getPuck: () => PuckApi) {
  // The imperative PuckApi accessor.
  (window as any).__getPuck = getPuck;
}
</script>

<template>
  <div class="editor">
    <Puck
      :config="config"
      :data="initialData"
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
