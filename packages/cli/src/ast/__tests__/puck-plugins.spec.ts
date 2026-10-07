import { ensurePuckPlugin } from "../puck-plugins";
import { readRecipe } from "../../../__tests__/helpers/harness";

const AUTH = {
  factory: "createAuthPlugin",
  source: "@puckeditor/plugin-auth",
  local: "authPlugin",
  css: "@puckeditor/plugin-auth/styles.css",
};

const codeOf = (result: { status: string; code?: string }) =>
  result.status === "inserted" ? result.code : result.status;

const add = (code: string) =>
  codeOf(ensurePuckPlugin(code, "editor.tsx", AUTH));

describe("ensurePuckPlugin", () => {
  it("adds a plugins prop to an editor without one", () => {
    expect(
      add(`"use client";

import { Puck } from "@puckeditor/core";
import config from "./puck.config";

export function Editor() {
  return <Puck config={config} data={{}} />;
}
`)
    ).toBe(`"use client";

import { Puck } from "@puckeditor/core";
import config from "./puck.config";
import { createAuthPlugin } from "@puckeditor/plugin-auth";
import "@puckeditor/plugin-auth/styles.css";

const authPlugin = createAuthPlugin();

export function Editor() {
  return <Puck plugins={[authPlugin]} config={config} data={{}} />;
}
`);
  });

  it("puts the prop on its own line when the props are", () => {
    expect(add(readRecipe("next", "app/puck/[...puckPath]/client.tsx")))
      .toContain(`    <Puck
      plugins={[authPlugin]}
      config={config}`);
  });

  it("appends to a module-level plugins array", () => {
    const code = add(
      readRecipe("next-ai", "app/puck/[...puckPath]/client.tsx")
    );
    expect(code).toContain(
      "const plugins = [aiPlugin, blocksPlugin(), outlinePlugin(), authPlugin];"
    );
    // Created before the array that uses it
    expect(code!.indexOf("const authPlugin")).toBeLessThan(
      code!.indexOf("const plugins")
    );
  });

  it("appends to an inline array spread over lines", () => {
    expect(
      add(`import { Puck } from "@puckeditor/core";

export const Editor = () => (
  <Puck
    plugins={[
      pagesPlugin,
    ]}
  />
);
`)
    ).toContain(`    plugins={[
      pagesPlugin,
      authPlugin,
    ]}`);
  });

  it("leaves editors that already have the plugin", () => {
    const once = add(readRecipe("next", "app/puck/[...puckPath]/client.tsx"))!;
    expect(add(once)).toBe("exists");
  });

  it("can't follow plugins built at runtime", () => {
    expect(
      add(`import { Puck } from "@puckeditor/core";

export const Editor = ({ plugins }) => <Puck plugins={plugins} />;
`)
    ).toBe("manual");
  });

  it("needs exactly one <Puck>", () => {
    expect(add(`import { Render } from "@puckeditor/core";\n`)).toBe("manual");
  });
});
