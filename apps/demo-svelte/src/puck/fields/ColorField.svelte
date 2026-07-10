<script>
  // A custom Svelte field. Field render props ({ id, name, value, onChange,
  // field, readOnly }) arrive as plain props; `onChange` flows straight back to
  // Puck. FieldLabel gives native-looking markup/CSS.
  import { FieldLabel } from "@puckeditor/svelte";

  let { name, value = "", field, readOnly = false, onChange } = $props();
</script>

<FieldLabel label={field?.label ?? name ?? ""} {readOnly}>
  <div class="color-field">
    <input
      type="color"
      value={value || "#7c3aed"}
      disabled={readOnly}
      oninput={(e) => onChange(e.currentTarget.value)}
    />
    <input
      type="text"
      {value}
      disabled={readOnly}
      oninput={(e) => onChange(e.currentTarget.value)}
    />
  </div>
</FieldLabel>

<style>
  .color-field {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .color-field input[type="text"] {
    flex: 1;
  }
</style>
