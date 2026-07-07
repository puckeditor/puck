<script setup lang="ts">
import type { Component } from "vue";

// `items` is a slot field. The bridge passes a stable outlet component; render
// it with `<component :is>` and Puck portals the (editable) DropZone into it.
defineProps<{ items?: Component; columns?: number }>();
</script>

<template>
  <div class="columns" :style="{ gridTemplateColumns: `repeat(${columns || 2}, 1fr)` }">
    <component :is="items" class="columns-slot" />
  </div>
</template>

<style scoped>
.columns {
  display: grid;
  gap: 12px;
  padding: 12px;
}
.columns-slot {
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  min-height: 64px;
}
</style>
