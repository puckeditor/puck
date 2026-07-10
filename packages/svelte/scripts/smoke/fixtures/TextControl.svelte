<script>
  import FieldLabel from "../../../svelte/FieldLabel.svelte";

  let { value = "", onChange, field, name } = $props();
</script>

<FieldLabel label={field?.label ?? name}>
  <input
    class="custom-field-input"
    {value}
    oninput={(e) => onChange(e.currentTarget.value)}
  />
</FieldLabel>
