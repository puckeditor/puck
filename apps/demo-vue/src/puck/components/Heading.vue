<script setup lang="ts">
import type { VueSlot } from "@puckeditor/vue";

// `title` is a contentEditable text field — node-valued, so the bridge passes
// it as an outlet component. Render it with `<component :is>`, like a slot.
defineProps<{ title?: VueSlot }>();
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
