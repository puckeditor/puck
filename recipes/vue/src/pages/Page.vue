<script setup lang="ts">
import { Render } from "@puckeditor/vue";
import "@puckeditor/vue/puck.css";
import { config, initialData } from "../puck.config";

const KEY = "puck-vue-recipe";
const data = JSON.parse(localStorage.getItem(KEY) || "null") || initialData;
</script>

<template>
  <div>
    <nav style="padding: 12px 24px; border-bottom: 1px solid #eee">
      <router-link to="/edit">Edit this page →</router-link>
    </nav>
    <Render :config="config" :data="data" />
  </div>
</template>
