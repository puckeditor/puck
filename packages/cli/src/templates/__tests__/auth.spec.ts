import { parseModule } from "../../ast/parse";
import { withRouteAuth } from "../auth";
import {
  NEXT_CLOUD_ROUTE,
  REACT_ROUTER_CLOUD_ROUTE,
  TANSTACK_START_CLOUD_ROUTE,
  withCloudHost,
  withoutAiOptions,
} from "../cloud";
import { readRecipe } from "../../../__tests__/helpers/harness";

const HOST = "http://localhost:3000/api";

// Every Cloud route the CLI writes, with and without a custom host
const ROUTES: [string, string][] = [
  ["next", NEXT_CLOUD_ROUTE],
  ["next-ai", readRecipe("next-ai", "app/api/puck/[...all]/route.ts")],
  ["react-router", REACT_ROUTER_CLOUD_ROUTE],
  ["react-router-ai", readRecipe("react-router-ai", "app/routes/api.puck.ts")],
  ["tanstack-start", TANSTACK_START_CLOUD_ROUTE],
  [
    "tanstack-start-ai",
    readRecipe("tanstack-start-ai", "src/routes/api/puck/$.ts"),
  ],
  ["hono", withoutAiOptions(readRecipe("hono-ai", "src/puck/cloud.ts"))],
  ["hono-ai", readRecipe("hono-ai", "src/puck/cloud.ts")],
  ["express-ai", readRecipe("express-ai", "src/puck/cloud.ts")],
  ["vite-ai", readRecipe("vite-ai", "server/puck/cloud.ts")],
  ["astro-ai", readRecipe("astro-ai", "src/pages/api/puck/[...all].ts")],
].flatMap(([name, route]): [string, string][] => [
  [name, route],
  [`${name} with a host`, withCloudHost(route, HOST)],
]);

describe("withRouteAuth", () => {
  it.each(ROUTES)("requires Sign in with Puck in the %s route", (_, route) => {
    const code = withRouteAuth(route)!;
    expect(code).not.toBeNull();
    expect(() => parseModule(code, "route.ts")).not.toThrow();
    expect(code.match(/auth: \{ provider: "puck" \}/g)).toHaveLength(1);
    // Nothing to import: puckHandler serves the sign-in routes itself
    expect(code).not.toContain("@puckeditor/cloud-client/auth");
    // Idempotent
    expect(withRouteAuth(code)).toBe(code);
  });

  it("adds auth to a one-line call or options", () => {
    expect(withRouteAuth(NEXT_CLOUD_ROUTE)).toContain(
      'return puckHandler(request, { auth: { provider: "puck" } });'
    );
    expect(withRouteAuth(REACT_ROUTER_CLOUD_ROUTE)).toContain(
      'const options: PuckCloudOptions = { auth: { provider: "puck" } };'
    );
  });

  it("adds auth first in multi-line options", () => {
    expect(withRouteAuth(readRecipe("hono-ai", "src/puck/cloud.ts")))
      .toContain(`const options: PuckCloudOptions = {
  auth: { provider: "puck" },
  ai: {`);
  });

  it("keeps a custom host", () => {
    expect(withRouteAuth(withCloudHost(NEXT_CLOUD_ROUTE, HOST))).toContain(
      `return puckHandler(request, { auth: { provider: "puck" }, host: "${HOST}" });`
    );
  });

  it("leaves the developer's own auth alone", () => {
    const custom = NEXT_CLOUD_ROUTE.replace(
      "puckHandler(request)",
      "puckHandler(request, { auth: { identity: await getUser(request) } })"
    );
    expect(withRouteAuth(custom)).toBeNull();
  });

  it("doesn't guess at routes it didn't write", () => {
    expect(
      withRouteAuth(
        `export const GET = (req: Request) => puckHandler(req, opts);\n`
      )
    ).toBeNull();
  });
});
