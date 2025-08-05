<br /><br /><br />

<div align="center">

<a href="https://puckeditor.com?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=logo">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/die3nptcg/image/upload/Puck_Logo_White_RGB_j2rwgg.svg" height="100px" aria-label="Puck logo">
    <img src="https://res.cloudinary.com/die3nptcg/image/upload/Puck_Logo_Black_RGB_dqsjag.svg" height="100px" aria-label="Puck logo">
  </picture>
</a>

_The visual editor for React_

[Documentation](https://puckeditor.com/docs?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=docs_link) • [Demo](https://demo.puckeditor.com/edit?utm_source=readme&utm_medium=code&utm_campaign=repo&utm_contents=demo_link) • [Discord](https://discord.gg/V9mDAhuxyZ) • [Contributing](https://github.com/puckeditor/puck/blob/main/CONTRIBUTING.md)

⭐️ Enjoying Puck? Please [leave a star](https://github.com/puckeditor/puck)!

<br />

[![GIF showing a page being created in the Puck Editor, with components being added, arranged, and customized in real time](https://github.com/user-attachments/assets/25e1ae25-ca5e-450f-afa0-01816830b731)](https://demo.puckeditor.com/edit)

</div>

## What is Puck?

Puck is a modular, open-source visual editor for React.js. You can use Puck to build custom drag-and-drop experiences with your own application and React components.

Because Puck is just a React component, it plays well with all React.js environments, including Next.js. You own your data and there’s no vendor lock-in.

Puck is also [licensed under MIT](https://github.com/puckeditor/puck?tab=MIT-1-ov-file#readme), making it suitable for both internal systems and commercial applications.

## Quick start

Install the package:

```sh
npm i @measured/puck --save # or npx create-puck-app my-app
```

Render the editor:

```jsx
// Editor.jsx
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";

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
import { Render } from "@measured/puck";
import "@measured/puck/puck.css";

export function Page() {
  return <Render config={config} data={data} />;
}
```

## Recipes

Use `create-puck-app` to quickly spin up a a pre-configured app based on our provided [recipes](https://github.com/puckeditor/puck/tree/main/recipes):

```sh
npx create-puck-app my-app
```

Available recipes include:

- [**next**](https://github.com/puckeditor/puck/tree/main/recipes/next): Next.js example, using App Router and static page generation
- [**remix**](https://github.com/puckeditor/puck/tree/main/recipes/remix): Remix Run v2 example, using dynamic routes at root-level
- [**react-router**](https://github.com/puckeditor/puck/tree/main/recipes/react-router): React Router v7 app example, using dynamic routes to create pages at any level

## Community

- [Discord server](https://discord.gg/D9e4E3MQVZ) for discussions
- [awesome-puck](https://github.com/puckeditor/awesome-puck) community repo for plugins, custom fields & more

## Get support

If you have any questions about Puck, please open a [GitHub issue](https://github.com/puckeditor/puck/issues) or join us on [Discord](https://discord.gg/D9e4E3MQVZ).

Or [book a discovery call](https://app.cal.com/chrisvxd/puck-enquiry/) for hands-on support and consultancy.

## License

MIT © [The Puck Contributors](https://github.com/puckeditor/puck/graphs/contributors)
