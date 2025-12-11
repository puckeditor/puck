Closes #XXXX

<!--
  Replace XXXX with the actual issue number this PR closes.
  Every PR should be linked to an issue.
  PRs without an issue may take longer to review or may be closed as non-actionable.
-->

## Description

This PR adds a `style` prop to the `Puck` component to allow customization of the editor layout styles.

<!--
  Include a concise and clear description of what this PR does.
  Mention any considerations or reasons behind the changes.
  Highlight any breaking changes.
  Keep the explanation centered around Puck.
 -->

## Changes made

- The `Puck` component now receives an optional `style` prop and passes it to the editor `div` wrapper.

<!--
  List the key changes made and the reasons behind them.
 -->

## How to test

- Render the `Puck` component with a two-column grid layout using the `style` prop and confirm it renders in two columns:

```tsx
<Puck style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }} />
```

<!--
  List any manual tests you did to verify the behavior of the changes.
  Add any media or screenshots that may help verify the outcome.
 -->
