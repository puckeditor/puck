---
name: puck
description: >-
  Set up, build with, and debug Puck, the visual editor for React (@puckeditor/core), and Puck Cloud and Puck AI.
  Use for adding Puck to a Next.js or React Router app, writing component configs, fields, slots, root config,
  overrides, plugins, theming, data migrations, and questions about the Puck API.
---

# Puck

Treat the docs bundled with the project's Puck version as the authority. This skill is version-neutral: don't rely on remembered APIs, the repository's default branch or the latest hosted docs when the project pins a version.

## Set up Puck

Use the CLI rather than wiring Puck up by hand. Check what's already set up first:

```sh
npx @puckeditor/cli status --json
```

Then run `init` (or the `nextSteps` command that `status` suggests):

```sh
npx @puckeditor/cli init --yes --json
```

Puck AI (which includes Puck Cloud) is optional. Unless the developer has already said whether they want it, let `init` return its `choose_ai` action and ask them, then rerun with `--ai` or `--no-ai`.

The CLI prints exactly one JSON document. When `status` is `action_required`, nothing has changed yet: show each entry in `actions` to the developer (for example, a Puck Cloud login URL and code), wait for them, then run its `rerun` command. When `status` is `partial`, complete the remaining `actions`. Don't retry an `error` without reading `error.message`.

## Find the version

Read the installed `@puckeditor/core` version from the project's lockfile, or from `node_modules/@puckeditor/core/package.json`. The CLI and core are released together, so use the same version for the CLI.

If the project doesn't use Puck yet, use `latest`. Don't replace a pinned version just to read newer docs.

## Read the docs

```sh
npx -y @puckeditor/cli@<version> docs ls                  # every page, in order
npx -y @puckeditor/cli@<version> docs find "<topic>"      # find pages by title or heading
npx -y @puckeditor/cli@<version> docs grep "<term>"       # search page content
npx -y @puckeditor/cli@<version> docs cat <page>          # print a page
```

Start with `docs cat getting-started` in unfamiliar projects. `cat` accepts a page path (`api-reference/fields/text`) or a link from another page (`/docs/api-reference/fields/text`). Add `--json` for structured output.

Read every relevant page before changing code. If the docs don't cover an API, don't invent it: say so, and suggest upgrading only if the task allows it.

Older releases shipped without the CLI. If `@puckeditor/cli@<version>` isn't published, read `https://puckeditor.com/v/<version>/docs` instead. The latest docs are also at `https://puckeditor.com/llms.txt`.

## Upgrading

Before upgrading, note the current version. Then read the changelog and the pages under `docs ls guides/migrations` for the target version, and apply any data migrations it describes.
