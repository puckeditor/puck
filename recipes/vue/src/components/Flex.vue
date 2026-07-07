<script setup lang="ts">
import type { Component } from "vue";

// `items` is a slot field: render it with <component :is> and Puck fills it.
defineProps<{ items?: Component }>();
</script>

<template>
  <component :is="items" style="display: flex; gap: 16px; padding: 16px 24px" />
</template>
