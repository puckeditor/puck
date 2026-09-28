# Puck for agents

Puck is a modular, open-source visual editor for React. Developers use it to build drag-and-drop page editors from their own React components. It's a React component (`<Puck>`), so it runs in any React app, including Next.js, React Router, TanStack Start and vinext.

This page is for coding agents. For humans, start at [puckeditor.com/docs](https://puckeditor.com/docs).

## Set up Puck

Use the CLI. It inspects the project, then makes the smallest set of changes needed to reach a working editor, optionally with Puck AI and Puck Cloud. It creates a new app if there isn't one.

```sh
npx @puckeditor/cli status --json    # see what's already set up
npx @puckeditor/cli init --yes --json
```

With `--yes --json` the CLI never prompts, and prints exactly one JSON document to stdout.

- `success`: done. `changed` is `false` if there was nothing to do.
- `action_required`: nothing has been changed yet. Show each entry in `actions` to the developer (for example, a Puck Cloud login URL), then run its `rerun` command.
- `partial`: changes were applied, but some `actions` must be completed by hand.
- `error`: see `error.code` and `error.message`.

Puck AI is optional and includes Puck Cloud. Unless you pass `--ai` or `--no-ai`, `init` returns a `choose_ai` action: ask the developer whether they want Puck AI, then run its `rerun` command with their choice. The full contract, actions and exit codes are in the [CLI docs](https://puckeditor.com/docs/cli.md).

## Read the docs

Read the docs for the Puck version the project uses, not the latest. The CLI ships with the docs for its release, and its version matches `@puckeditor/core`:

```sh
npx -y @puckeditor/cli@<version> docs ls
npx -y @puckeditor/cli@<version> docs find "external data"
npx -y @puckeditor/cli@<version> docs cat api-reference/fields/text
npx -y @puckeditor/cli@<version> docs grep resolveData
```

Replace `<version>` with the installed `@puckeditor/core` version from the project's lockfile or `node_modules`. Only use `@latest` for projects that don't use Puck yet. Every command also accepts `--json`.

Older releases shipped without the CLI. If `@puckeditor/cli@<version>` isn't published, read `https://puckeditor.com/v/<version>/docs` instead.

The latest docs are also published as markdown:

- [llms.txt](https://puckeditor.com/llms.txt): index of every page
- [llms-full.txt](https://puckeditor.com/llms-full.txt): every page in one file
- Any page as markdown: add `.md` to its URL, like [/docs/getting-started.md](https://puckeditor.com/docs/getting-started.md)

## Skill

Agents with skill support can install the Puck skill, which routes to the docs for the installed version:

```sh
npx skills add puckeditor/puck
```

## Guidelines

- Don't guess APIs. Read the relevant page before changing code.
- Puck data is plain JSON. Validate changes against the [data model](https://puckeditor.com/docs/api-reference/data-model/data.md).
- The `/api/puck` route and the editor are public by default. Tell the developer to add authentication before deploying.
