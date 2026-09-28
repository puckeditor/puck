import {
  ensureOptimizeDepsInclude,
  ensureSsrExternal,
} from "../vite-optimize-deps";
import { readRecipe } from "../../../__tests__/helpers/harness";

const CORE = "@puckeditor/core";
const AI = "@puckeditor/plugin-ai";

const ensure = (code: string, pkgs = [CORE]) =>
  ensureOptimizeDepsInclude(code, "vite.config.ts", pkgs);

const codeOf = (result: ReturnType<typeof ensure>) =>
  result.status === "inserted" ? result.code : result.status;

const STOCK = `import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
});
`;

describe("ensureOptimizeDepsInclude", () => {
  it("turns the create-react-router config into the recipe byte for byte", () => {
    expect(codeOf(ensure(STOCK))).toBe(
      readRecipe("react-router", "vite.config.ts")
    );
    expect(codeOf(ensure(STOCK, [CORE, AI]))).toBe(
      readRecipe("react-router-ai", "vite.config.ts")
    );
  });

  it("appends plugin-ai to the react-router recipe to get the AI recipe", () => {
    expect(
      codeOf(ensure(readRecipe("react-router", "vite.config.ts"), [CORE, AI]))
    ).toBe(readRecipe("react-router-ai", "vite.config.ts"));
  });

  it("is a no-op when every package is already included", () => {
    expect(
      ensure(readRecipe("react-router-ai", "vite.config.ts"), [CORE, AI]).status
    ).toBe("exists");
  });

  it("adds include to an existing optimizeDeps object", () => {
    const code = `export default defineConfig({
  optimizeDeps: {
    exclude: ["foo"],
  },
});
`;
    expect(codeOf(ensure(code))).toBe(`export default defineConfig({
  optimizeDeps: {
    exclude: ["foo"],
    include: ["@puckeditor/core"],
  },
});
`);
  });

  it("appends to a multi-line include array", () => {
    const code = `export default defineConfig({
  optimizeDeps: {
    include: [
      "foo"
    ],
  },
});
`;
    expect(codeOf(ensure(code))).toContain(`      "foo",
      "@puckeditor/core"
    ],`);
  });

  it("matches single quotes and a missing trailing comma", () => {
    const code = `import { defineConfig } from 'vite'

export default defineConfig({
  plugins: []
})
`;
    expect(codeOf(ensure(code))).toBe(`import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  optimizeDeps: {
    include: ['@puckeditor/core'],
  }
})
`);
  });

  it("handles single-line and bare object configs", () => {
    expect(codeOf(ensure(`export default { plugins: [] };\n`))).toBe(
      `export default { plugins: [], optimizeDeps: { include: ["@puckeditor/core"] } };\n`
    );
    expect(codeOf(ensure(`export default defineConfig({});\n`))).toBe(
      `export default defineConfig({optimizeDeps: { include: ["@puckeditor/core"] }});\n`
    );
  });

  it("asks for a manual edit when the config can't be edited safely", () => {
    for (const code of [
      `export default defineConfig(() => ({ plugins: [] }));\n`,
      `const config = {};\nexport default config;\n`,
      `export default defineConfig({ ...base });\n`,
      `export default defineConfig({ optimizeDeps: shared });\n`,
      `export default defineConfig({ optimizeDeps: { include: deps } });\n`,
      `export default defineConfig({`,
    ]) {
      expect({ code, status: ensure(code).status }).toEqual({
        code,
        status: "manual",
      });
    }
  });
});

describe("ensureSsrExternal", () => {
  const OIDC = ["@vercel/oidc"];
  const external = (code: string) =>
    ensureSsrExternal(code, "vite.config.ts", OIDC);

  it("turns the vinext recipe config into the AI recipe byte for byte", () => {
    const result = external(readRecipe("vinext", "vite.config.ts"));
    expect(result.status === "inserted" && result.code).toBe(
      readRecipe("vinext-ai", "vite.config.ts")
    );
  });

  it("is a no-op when the package or everything is already external", () => {
    expect(external(readRecipe("vinext-ai", "vite.config.ts")).status).toBe(
      "exists"
    );
    expect(
      external(`export default defineConfig({ ssr: { external: true } });\n`)
        .status
    ).toBe("exists");
  });

  it("asks for a manual edit when ssr.external isn't a list", () => {
    expect(
      external(`export default defineConfig({ ssr: { external: deps } });\n`)
    ).toEqual({
      status: "manual",
      detail: "ssr.external is not a list of package names",
    });
  });
});
