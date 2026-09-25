import { analyzeRoutes, insertRoute } from "../react-router-routes";
import { readRecipe } from "../../../__tests__/helpers/harness";

const EDITOR = { path: "*", file: "routes/puck-splat.tsx" };
const CLOUD = { path: "api/puck/*", file: "routes/api.puck.ts" };

const insert = (
  code: string,
  entry = CLOUD,
  position: "before-splat" | "end" = "before-splat",
  rejectExistingSplat = false
) =>
  insertRoute(code, "app/routes.ts", entry, { position, rejectExistingSplat });

describe("insertRoute", () => {
  it("turns the react-router recipe routes into the react-router-ai routes byte for byte", () => {
    const result = insert(readRecipe("react-router", "app/routes.ts"));
    expect(result.status).toBe("inserted");
    expect(result.status === "inserted" && result.code).toBe(
      readRecipe("react-router-ai", "app/routes.ts")
    );
  });

  it("is a no-op when the route already exists", () => {
    expect(insert(readRecipe("react-router-ai", "app/routes.ts")).status).toBe(
      "exists"
    );
  });

  it("adds the route import and entry to the create-react-router shape", () => {
    const code = `import { type RouteConfig, index } from "@react-router/dev/routes";

export default [index("routes/home.tsx")] satisfies RouteConfig;
`;
    const editor = insert(code, EDITOR, "end", true);
    expect(editor.status === "inserted" && editor.code)
      .toBe(`import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("*", "routes/puck-splat.tsx")] satisfies RouteConfig;
`);

    const cloud = insert(editor.status === "inserted" ? editor.code : "");
    expect(cloud.status === "inserted" && cloud.code).toContain(
      `[index("routes/home.tsx"), route("api/puck/*", "routes/api.puck.ts"), route("*", "routes/puck-splat.tsx")]`
    );
  });

  it("uses an aliased route import", () => {
    const code = `import { route as r, index } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
];
`;
    const result = insert(code);
    expect(result.status === "inserted" && result.code).toContain(
      `  r("api/puck/*", "routes/api.puck.ts"),\n];`
    );
  });

  it("handles `as` casts, single quotes and missing trailing commas", () => {
    const code = `import type { RouteConfig } from '@react-router/dev/routes';
import { index } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx')
] as RouteConfig;
`;
    const result = insert(code);
    expect(result.status).toBe("inserted");
    expect(result.status === "inserted" && result.code)
      .toBe(`import type { RouteConfig } from '@react-router/dev/routes';
import { index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('api/puck/*', 'routes/api.puck.ts')
] as RouteConfig;
`);
  });

  it("adds a new import when only a type import exists", () => {
    const code = `import type { RouteConfig } from "@react-router/dev/routes";

export default [] satisfies RouteConfig;
`;
    const result = insert(code, EDITOR, "end");
    expect(result.status === "inserted" && result.code).toContain(
      `import { route } from "@react-router/dev/routes";`
    );
    expect(result.status === "inserted" && result.code).toContain(
      `[route("*", "routes/puck-splat.tsx")]`
    );
  });

  it("refuses to add a second catch-all", () => {
    const result = insert(
      readRecipe("react-router", "app/routes.ts"),
      EDITOR,
      "end",
      true
    );
    expect(result.status).toBe("exists");

    const other = `import { route } from "@react-router/dev/routes";
export default [route("*", "routes/other.tsx")];
`;
    expect(insert(other, EDITOR, "end", true)).toMatchObject({
      status: "manual",
      reason: "conflict",
    });
  });

  it("treats a nested splat as a conflict", () => {
    const code = `import { route, layout } from "@react-router/dev/routes";
export default [layout("routes/layout.tsx", [route("*", "routes/other.tsx")])];
`;
    expect(analyzeRoutes(code, "routes.ts")).toMatchObject({
      ok: true,
      nestedSplat: true,
    });
    expect(insert(code, EDITOR, "end", true)).toMatchObject({
      status: "manual",
      reason: "conflict",
    });
  });

  it("asks for a manual edit with flatRoutes()", () => {
    const code = `import { flatRoutes } from "@react-router/fs-routes";
export default flatRoutes();
`;
    expect(insert(code)).toMatchObject({
      status: "manual",
      reason: "unsupported_shape",
    });
  });

  it("asks for a manual edit when `route` is taken", () => {
    const code = `const route = 1;
export default [];
`;
    expect(insert(code)).toMatchObject({ status: "manual" });
  });
});
