<script setup lang="ts">
import type { Component } from "vue";

// `title` is a contentEditable text field. Core swaps its value for an inline
// editor element in the editor (a plain string in <Render>), so the bridge
// passes it as an outlet — render it with `<component :is>`, like a slot.
defineProps<{ title?: string | Component }>();
</script>

<template>
  <h1 class="heading"><component :is="title" /></h1>
</template>

<style scoped>
.heading {
  margin: 0;
  padding: 24px;
  font-size: 2rem;
}
</style>
