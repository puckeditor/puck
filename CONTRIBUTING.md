# Contributing to Puck

Puck is still under heavy development, having gained significant interest at an early stage. The contribution guidelines are designed to help us balance community engagement with our vision and direction.

## Reporting bugs or requesting features

Bugs and feature requests are best reported via GitHub issues. Always check if the issue already exists before opening a new one.

If you're unsure whether or not you've encountered a bug, feel free to ask first 👇

## Asking questions

There are several ways to ask questions or ask for help:

- Open a [discussion](https://github.com/measuredco/puck/discussions) via GitHub
- Use the #chat or #help channels in our [Discord server](https://discord.gg/D9e4E3MQVZ)

_Please only use GitHub issues for bugs and feature requests, and not for questions._

## Labels

We manage our backlog using labels. Labels can help you understand the status of each ticket.

### Status labels

- **ready** - this ticket has a description and is ready to be worked on.
- **in triage** - this ticket has been seen by the Puck team and we are identifying next steps. Tickets may stay in this state until we're ready to process them.
- **blocked** - this ticket is blocked by another ticket. The relationship should be made apparent in the comments.

### Type labels

Denoted by the `type:` prefix.

- **type: bug**
- **type: feature**
- **type: docs**
- **type: performance**
- **type: test**

### Other labels

- **good first issue** - if you're new to contributing on Puck, this is a good place to start.
- **opinions wanted** - we're looking for opinions on this ticket. Feel free to chime in with comments or suggestions.

## Contributing code

### When to contribute

#### Existing issues

If picking up an existing GitHub issue, please respect the **ready** status label.

Any PRs made to close issues without the **ready** label are at risk of being premature and likely to be rejected.

#### New issues

If you've reported a bug via an issue and have a fix, you don't need to wait for the **ready** label before proposing a fix.

It's also okay to propose solutions to your own feature requests, but without proper discussion the solution may be rejected.

#### No issue

PRs without issues may be accepted for small fixes, but larger changes may be rejected or require further discussion.

### Setting up the environment

Puck uses:

- TypeScript
- CSS Modules
- Turborepo for monorepo tooling
- Yarn for package management and release automation
- Next.js for demo applications

To get setup, first clone the repo and then install the dependencies:

```sh
yarn
```

Rather than running the entire monorepo, it's quicker to run the project you need.

Generally, it's easiest to work in the context of the demo application:

```sh
cd apps/demo
yarn dev
```

### Style

#### TypeScript

- Avoid the use of `any`.
- Tests appreciated, but not required. They may be requested for complicated code.

#### CSS

- Class names must follow the [SUIT CSS](https://suitcss.github.io) methodology. This is a tooling-angostic convention used at [@puckeditor](https://github.com/puckeditor) for all CSS work.
- Don't rely on global styles. Puck is deployed into hostile third-party environments and we have no control over what CSS may be running on the page.

#### Commits

**Keep your PRs focused to a single issue**. This makes it easier to review and is necessary for our release process.

We rely on [angular-style conventional commits](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) for automating our releases, determining the version bump and generating our changelog.

You generally don't need to write perfect commit messages yourselves - we squash most PRs and rewrite the messages on merge.

If you need to solve multiple issues, it's best to split it into multiple PRs. Or, if you're comfortable writing conventional commits, you can also split each change into a separate commit. The team is more likely to have opinions about this and you may be asked to reword your commits.

### Additional guidance

#### Public APIs

If your PR introduces or changes public APIs, it will come under additional scrutiny to avoid introducing breaking changes.

## Releases

### Canary

A canary release is automatically deployed after each merge to `main`. These are suffixed with the hash of the commit, for example `0.10.0-canary.42c24f1`.

### Latest

Releases are triggered manually when the team feels the `main` branch is sufficiently stable.
