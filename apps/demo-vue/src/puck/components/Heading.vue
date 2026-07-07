<script setup lang="ts">
// Plain props — the simplest bridged component.
defineProps<{ title?: string }>();
</script>

<template>
  <h1 class="heading">{{ title }}</h1>
</template>

<style scoped>
.heading {
  margin: 0;
  padding: 24px;
  font-size: 2rem;
}
</style>
