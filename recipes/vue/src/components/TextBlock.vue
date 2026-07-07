<script setup lang="ts">
defineProps<{ text?: string }>();
</script>

<template>
  <p style="padding: 8px 24px; margin: 0">{{ text }}</p>
</template>
