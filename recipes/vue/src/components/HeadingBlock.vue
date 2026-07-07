<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <h1 style="padding: 16px 24px; margin: 0">{{ title }}</h1>
</template>
