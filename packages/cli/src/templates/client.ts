/**
 * Browser-side templates for apps without a server of their own
 * (`--backend none`).
 */
export const LOCAL_PAGES_MODULE = `import type { Data } from "@puckeditor/core";

// Saves pages in this browser's localStorage. Replace this with calls to your
// own API to share pages between people and devices.
const key = (path: string) => \`puck:\${path}\`;

export const loadPage = async (path: string): Promise<Data | null> => {
  const saved = localStorage.getItem(key(path));
  return saved ? JSON.parse(saved) : null;
};

export const savePage = async (path: string, data: Data) => {
  localStorage.setItem(key(path), JSON.stringify(data));
};
`;

/** A static Astro page for the editor, which picks the page with ?path= */
export const ASTRO_EDITOR_PAGE = `---
// The Puck editor. Choose the page with ?path=, e.g. /edit?path=/about
import Editor from "../puck/editor";
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Edit</title>
  </head>
  <body style="margin: 0">
    <Editor client:only="react" />
  </body>
</html>
`;
