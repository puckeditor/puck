<script setup lang="ts">
// A custom Vue field. Field render props ({ id, name, value, onChange, field,
// readOnly }) arrive as plain props; `onChange` flows straight back to Puck.
// FieldLabel gives native-looking markup/CSS.
import { FieldLabel } from "@puckeditor/vue";

const props = defineProps<{
  id?: string;
  name?: string;
  value?: string;
  field?: { label?: string };
  readOnly?: boolean;
  onChange: (value: string) => void;
}>();
</script>

<template>
  <FieldLabel :label="field?.label || name || ''" :read-only="readOnly">
    <div class="color-field">
      <input
        type="color"
        :value="value || '#7c3aed'"
        :disabled="readOnly"
        @input="onChange(($event.target as HTMLInputElement).value)"
      />
      <input
        type="text"
        :value="value"
        :disabled="readOnly"
        @input="onChange(($event.target as HTMLInputElement).value)"
      />
    </div>
  </FieldLabel>
</template>

<style scoped>
.color-field {
  display: flex;
  gap: 8px;
  align-items: center;
}
.color-field input[type="text"] {
  flex: 1;
}
</style>
