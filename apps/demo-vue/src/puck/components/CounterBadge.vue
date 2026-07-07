<script setup lang="ts">
// Reads a Pinia store. Works because <Puck>/<Render> receive the `app` prop
// (an app instance with Pinia installed), whose context the bridge threads into
// every mount.
import { useCounterStore } from "../../store";

const counter = useCounterStore();
</script>

<template>
  <div class="counter-badge">
    <span>Pinia count: <strong>{{ counter.count }}</strong></span>
    <button type="button" @click="counter.increment()">+1</button>
  </div>
</template>

<style scoped>
.counter-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 12px;
  background: #f1f5f9;
  border-radius: 999px;
}
.counter-badge button {
  cursor: pointer;
}
</style>
