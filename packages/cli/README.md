# @puckeditor/cli

Set up [Puck](https://puckeditor.com), and optionally Puck AI and Puck Cloud, in a new or existing Next.js, React Router or vinext app. Built for coding agents, friendly for humans.

## Usage

```sh
npx @puckeditor/cli init
```

For coding agents:

```sh
npx @puckeditor/cli init --yes --json --ai     # or --no-ai for the editor only
```

Other commands:

```sh
npx @puckeditor/cli add editor   # add the Puck editor
npx @puckeditor/cli add cloud    # connect Puck Cloud
npx @puckeditor/cli add ai       # add the Puck AI plugin
npx @puckeditor/cli status       # show what's set up
npx @puckeditor/cli doctor       # diagnose problems
npx @puckeditor/cli docs         # read the docs for this version
```

See the [CLI docs](https://puckeditor.com/docs/cli) for the full JSON contract, actions and exit codes.

## Development

The CLI integrates Puck using the [recipes](../../recipes) as templates. Tests read the recipes directly, and `pnpm build` copies them into `dist/templates`.

`pnpm build` also exports the [docs site](../../apps/docs) as markdown into `dist/docs`, for `puck docs`.

```sh
pnpm build
node dist/bin.mjs status
```

Set `PUCK_CLOUD_URL` to point the CLI at a local Puck Cloud.

## License

MIT © [The Puck Contributors](https://github.com/puckeditor/puck/graphs/contributors)
