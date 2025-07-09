---
name: "Bug Report 🐛"
about:
  Report a problem with Puck. Please provide enough information to reproduce
  the problem.
title: ""
labels: ["type: bug 🐛"]
assignees: ""
---

## Description

[Example: "The `<Puck />` component doesn't render correctly inside a CSS grid layout..."]

<!--
  Provide a clear and concise description of the bug.
  Don't assume we know anything about your repository or codebase.
  Keep it centered around Puck—avoid detailing your use case unless it directly helps explain the issue.
  Test the issue using the latest version of Puck to confirm it hasn't already been fixed.
-->

## Environment

- Puck version: [0.19.0, 1.0.0...]
- Browser version: [Chrome 135 (desktop), Firefox 133 (mobile)...]
- Additional environment info: [bundler, OS, device type...]

<!--
  Detail the environment where the bug is occurring.
-->

## Steps to reproduce

1. Render the `<Puck />` component in a grid layout...

```tsx
const Editor = () => {
  return (
    <div style={{ display: "grid" }}>
      <Puck config={config} data={data} />
    </div>
  );
};
```

2. Run the application in development mode...

<!--
  Provide clear steps with code examples so that we can reproduce the bug.
  Avoid including dependencies other than Puck.
  Issues without reproduction steps or code examples may be closed as not actionable.
  For help on providing minimal, reproducible examples: https://stackoverflow.com/help/mcve
-->

## What happens

[Example: "A white screen appears and the editor doesn't load..."]

<!--
  State what is the result of the steps above.
  Keep the explanation short and clear.
-->

## What I expect to happen

[Example: "The Puck component should render correctly in any CSS layout..."]

<!--
  State what was the result you expected from the steps above.
  Keep the explanation short and clear.
-->

## Additional Media

<!--
  Include any screenshots, videos, or other relevant media that may help
  visualize the issue or demonstrate the behavior.
-->
