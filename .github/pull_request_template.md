Closes #XXXX

<!--
  Replace XXXX with the actual issue number this PR closes.
  Every PR should be linked to an issue. 
  PRs without an issue may take longer to review or may be closed as non-actionable.
-->

## Description

This PR adds the `test` trigger to the `resolveData` params, matching the behavior of `resolveFields`.
This introduces a breaking change to the `resolveData` `changed` parameter, as all changes are now nested under a `test` key.

<!-- 
  Include a concise and clear description of what this PR does.
  Mention any considerations or reasons behind the changes.
  Highlight any breaking changes.
  Keep the explanation centered around Puck.
 -->

## Changes made

- The `resolveData` config type now includes a new `test` trigger param.
  - A new hook `useTestResolveData` was added to track when testing a component and call resolveComponentData with a `test` trigger.

<!-- 
  List the key changes made and the reasons behind them.
 -->

## Manual tests

- Confirmed that `resolveData` runs the same number of times on editor load, insertion, deletion, replacement, and reordering within the same slot, using sample data and config.
- Confirmed that conditional data resolution based on the parent works as expected:

<!-- 
  List any manual tests you did to verify the behavior of the changes.
  Add any media or screenshots that may help verify the outcome.
 -->