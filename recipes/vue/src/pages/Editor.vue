<script setup lang="ts">
import { useRouter } from "vue-router";
import { Puck } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config, initialData } from "../puck.config";

const router = useRouter();

const KEY = "puck-vue-recipe";
const data = JSON.parse(localStorage.getItem(KEY) || "null") || initialData;

function onPublish(next: unknown) {
  localStorage.setItem(KEY, JSON.stringify(next));
  router.push("/");
}
</script>

<template>
  <div style="height: 100vh">
    <Puck :config="config" :data="data" @publish="onPublish" />
  </div>
</template>
