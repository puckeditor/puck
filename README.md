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

Puck is a modular, open-source visual editor for React.js. You can use Puck to build custom drag-and-drop experiences with your own application and React components.

Because Puck is just a React component, it plays well with all React.js environments, including Next.js. You own your data and there’s no vendor lock-in.

Puck is also [licensed under MIT](https://github.com/puckeditor/puck?tab=MIT-1-ov-file#readme), making it suitable for both internal systems and commercial applications.

If you need full-stack features that work seamlessly with Puck, you can incrementally add the [Puck Cloud](#puck-cloud) modules you need. For example, [Puck AI](#ai) adds AI generation to the editor.

## Quick start

Run the [Puck CLI](https://puckeditor.com/docs/cli) and follow the steps:

```sh
npx @puckeditor/cli init
```

### Manual setup

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

// Save the data to your database
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

## Puck Cloud

Puck Cloud modules add full-stack features to Puck with minimal setup. Each module gives you an official solution for a common need, like AI, without having to build everything from scratch yourself.

### Setup

Run the CLI and follow the steps:

```sh
npx @puckeditor/cli add cloud
```

#### Manual setup

Create a [Puck Cloud account](https://cloud.puckeditor.com/sign-up).

Install the Cloud Client in your server:

```sh
npm i @puckeditor/cloud-client --save
```

Set your [Puck API key](https://cloud.puckeditor.com/api-keys):

```sh
# .env
PUCK_API_KEY=your-api-key
```

Add a catch-all route for `/api/puck/*` that passes the request to `puckHandler` and returns its response:

```js
// Next.js app/api/puck/[...all]/route.js
import { puckHandler } from "@puckeditor/cloud-client";

const handleRequest = (request) => puckHandler(request);

export const DELETE = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
```

See the [docs](https://puckeditor.com/docs/ai/getting-started#add-server-side-endpoints) for React Router, Hono, and TanStack Start examples.

### AI

[Puck AI](https://puckeditor.com/docs/ai/overview) is the recommended way to add AI to Puck. It generates pages with your existing components, or builds new ones that follow your rules and constraints. It works from your Puck config, so you can get started without long prompts or model tuning.

Run the CLI and follow the steps:

```sh
npx @puckeditor/cli add ai
```

See the [Puck AI docs](https://puckeditor.com/docs/ai/overview) for more features, like [business context](https://puckeditor.com/docs/ai/business-context), [tools](https://puckeditor.com/docs/ai/tools), [design mode](https://puckeditor.com/docs/ai/design-mode) and [bring your own key](https://puckeditor.com/docs/ai/model-configuration#bring-your-own-key).

#### Manual setup

Install the AI plugin:

```sh
npm i @puckeditor/plugin-ai --save
```

Add it to the editor:

```jsx
// Editor.jsx
import { Puck } from "@puckeditor/core";
import { createAiPlugin } from "@puckeditor/plugin-ai";
import "@puckeditor/plugin-ai/styles.css";

const aiPlugin = createAiPlugin();

export function Editor() {
  return (
    <Puck
      plugins={[aiPlugin]}
      config={config}
      data={initialData}
      onPublish={save}
    />
  );
}
```

If your server uses a different URL than your editor, set the plugin's [`host`](https://puckeditor.com/docs/api-reference/ai/ai-plugin/create-ai-plugin#host):

```jsx
const aiPlugin = createAiPlugin({
  host: "https://example.com/api/puck/chat",
});
```

## Community

- [Discord server](https://discord.gg/D9e4E3MQVZ) for discussions
- [awesome-puck](https://github.com/puckeditor/awesome-puck) community repo for plugins, custom fields & more

## Get support

If you have any questions about Puck, please open a [GitHub issue](https://github.com/puckeditor/puck/issues) or join us on [Discord](https://discord.gg/D9e4E3MQVZ).

Or [book a discovery call](https://app.cal.com/chrisvxd/puck-enquiry/) for hands-on support and consultancy.

## License

MIT © [The Puck Contributors](https://github.com/puckeditor/puck/graphs/contributors)
