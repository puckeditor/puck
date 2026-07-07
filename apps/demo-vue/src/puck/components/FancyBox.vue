<script setup lang="ts">
// Uses `<style scoped>`. Vite injects the scoped CSS into the document head;
// AutoFrame mirrors head styles into the editor iframe, so this renders styled
// in the preview with no extra work. `color` is edited via a custom Vue field.
defineProps<{ text?: string; color?: string }>();
</script>

<template>
  <div class="fancy-box" :style="{ borderColor: color }">
    <span class="fancy-text" :style="{ color }">{{ text }}</span>
  </div>
</template>

<style scoped>
.fancy-box {
  border: 3px solid;
  border-radius: 12px;
  padding: 20px;
  margin: 12px;
  text-align: center;
}
.fancy-text {
  font-weight: 700;
  font-size: 1.25rem;
}
</style>
