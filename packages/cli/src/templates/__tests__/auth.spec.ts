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
  it.each(ROUTES)("authenticates the %s route", (_, route) => {
    for (const auth of ["unowned", "puckAuth"] as const) {
      const code = withRouteAuth(route, "route.ts", auth)!;
      expect(code).not.toBeNull();
      expect(() => parseModule(code, "route.ts")).not.toThrow();
      expect(code.match(/authenticate:/g)).toHaveLength(1);
      expect(code).not.toContain("PuckCloudOptions");
      // Idempotent
      expect(withRouteAuth(code, "route.ts", auth)).toBe(code);
    }
  });

  it("keeps routes open to anyone with the API key when unowned", () => {
    expect(withRouteAuth(NEXT_CLOUD_ROUTE, "route.ts", "unowned")).toContain(
      "return puckHandler(request, { authenticate: () => ({ id: null }) });"
    );
    expect(
      withRouteAuth(REACT_ROUTER_CLOUD_ROUTE, "route.ts", "unowned")
    ).toContain(
      "const options: PuckHandlerOptions = { authenticate: () => ({ id: null }) };"
    );
  });

  it("adds authenticate first in multi-line options", () => {
    expect(
      withRouteAuth(
        readRecipe("hono-ai", "src/puck/cloud.ts"),
        "cloud.ts",
        "puckAuth"
      )
    ).toContain(`import { puckAuth } from "@puckeditor/cloud-client/auth";

const options: PuckHandlerOptions = {
  authenticate: puckAuth,
  ai: {`);
  });

  it("signs in to a custom host", () => {
    const code = withRouteAuth(
      withCloudHost(NEXT_CLOUD_ROUTE, HOST),
      "route.ts",
      "puckAuth",
      HOST
    );
    expect(code).toContain(
      `return puckHandler(request, { authenticate: puckAuth, host: "${HOST}" });`
    );
    expect(code).toContain(
      `const puckAuth = createPuckAuth({ host: "${HOST}" });`
    );
  });

  it("switches an unowned route to Sign in with Puck", () => {
    const unowned = withRouteAuth(NEXT_CLOUD_ROUTE, "route.ts", "unowned")!;
    expect(withRouteAuth(unowned, "route.ts", "puckAuth")).toBe(
      withRouteAuth(NEXT_CLOUD_ROUTE, "route.ts", "puckAuth")
    );
  });

  it("leaves custom authentication to the developer", () => {
    const custom = NEXT_CLOUD_ROUTE.replace(
      "puckHandler(request)",
      "puckHandler(request, { authenticate: getUser })"
    );
    expect(withRouteAuth(custom, "route.ts", "unowned")).toBe(custom);
    expect(withRouteAuth(custom, "route.ts", "puckAuth")).toBeNull();
  });

  it("doesn't guess at routes it didn't write", () => {
    expect(
      withRouteAuth(
        `export const GET = (req: Request) => puckHandler(req, opts);\n`,
        "route.ts",
        "unowned"
      )
    ).toBeNull();
  });
});
