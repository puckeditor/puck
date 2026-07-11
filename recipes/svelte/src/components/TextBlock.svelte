<script lang="ts">
  let { text = "" }: { text?: string } = $props();
</script>

<p style="padding: 8px 24px; max-width: 60ch">{text}</p>
