<br /><br /><br />

<div align="center">

<a href="https://puckeditor.com?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=logo">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/die3nptcg/image/upload/Puck_Logo_White_RGB_j2rwgg.svg" height="100px" aria-label="Puck logo">
    <img src="https://res.cloudinary.com/die3nptcg/image/upload/Puck_Logo_Black_RGB_dqsjag.svg" height="100px" aria-label="Puck logo">
  </picture>
</a>

_The visual editor for React_

[Documentation](https://puckeditor.com/docs?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=docs_link) • [Puck AI](https://puckeditor.com/docs/ai/overview?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=ai_link) • [Demo](https://demo.puckeditor.com/edit?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=demo_link) • [Discord](https://discord.gg/V9mDAhuxyZ)

⭐️ Enjoying Puck? Please [leave a star](https://github.com/puckeditor/puck)!

<br />

[![GIF showing a page being created in the Puck Editor, with components being added, arranged, and customized in real time](https://github.com/user-attachments/assets/25e1ae25-ca5e-450f-afa0-01816830b731)](https://demo.puckeditor.com/edit)

</div>

## What is Puck?

Puck is an open-source visual editor for React. Embed it in your application to build interfaces with drag-and-drop, powered by your own React components.

Because Puck is just a React component, it fits into existing React applications. You own your components and data, with no vendor lock-in.

Puck is also [licensed under MIT](https://github.com/puckeditor/puck?tab=MIT-1-ov-file#readme), making it suitable for both internal systems and commercial applications.

## Quick start

Run the [Puck CLI](https://puckeditor.com/docs/cli):

```sh
npx @puckeditor/cli@0.24.0-canary.fd916921 init
```

<details>
<summary><strong>Manual setup</strong></summary>
<br />

Install the package:

```sh
npm i @puckeditor/core --save
```

Render the editor:

```jsx
// Editor.jsx
import { Puck } from "@puckeditor/core";

// Create Puck component config
const config = {
  components: {
    HeadingBlock: {
      fields: {
        children: {
          type: "text",
        },
      },
      render: ({ children }) => {
        return <h1>{children}</h1>;
      },
    },
  },
};

// Describe the initial data
const initialData = {};

// Store pages in your own database, or run `npx @puckeditor/core add pages`
// to store, version and publish them with Puck Pages
const save = (data) => {};

// Render Puck editor
export function Editor() {
  return <Puck config={config} data={initialData} onPublish={save} />;
}
```

Render the page:

```jsx
// Page.jsx
import { Render } from "@puckeditor/core";

export function Page() {
  return <Render config={config} data={data} />;
}
```

</details>

## Puck Cloud

Puck Cloud is a modular backend for your Puck editor:

- **Pages**: store, version and publish pages
- **Auth**: sign editors in
- **Assets**: store images and files
- **AI**: generate pages with an AI copilot

Puck Cloud is free to start with, and scales with usage.

### Pages

[Puck Pages](#) is a hosted page store built for Puck, providing version history and data migrations.

```sh
npx @puckeditor/core add pages
```

Or [set it up manually](https://puckeditor.com/docs/…).

### Auth

[Puck Auth](#) provides managed authentication for Puck, allowing users to sign-in with a Puck Cloud account.

```sh
npx @puckeditor/core add auth
```

Or [set it up manually](https://puckeditor.com/docs/…).

### AI

[Puck AI](https://puckeditor.com/docs/ai/overview) is an AI agent for Puck for generating interfaces directly from the editor.

```sh
npx @puckeditor/core add ai
```

Or [set it up manually](https://puckeditor.com/docs/…).

## Community

- [Discord server](https://discord.gg/D9e4E3MQVZ) for discussions
- [awesome-puck](https://github.com/puckeditor/awesome-puck) community repo for plugins, custom fields & more

## Get support

If you have any questions about Puck, please open a [GitHub issue](https://github.com/puckeditor/puck/issues) or join us on [Discord](https://discord.gg/D9e4E3MQVZ).

## License

MIT © [The Puck Contributors](https://github.com/puckeditor/puck/graphs/contributors)
