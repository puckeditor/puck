<script setup lang="ts">
import { ref } from "vue";

// `count` is Vue-local state. Editing the title/description fields patches props
// in place (never remounts), so this counter must NOT reset — that's the proof
// that the bridge patches rather than remounts.
defineProps<{ title?: string; description?: string }>();
const count = ref(0);
</script>

<template>
  <div class="card">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button type="button" @click="count++">
      Local state (survives prop edits): {{ count }}
    </button>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin: 12px;
}
.card button {
  cursor: pointer;
  padding: 6px 10px;
}
</style>
