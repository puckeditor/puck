import type { RouteConfig } from "@react-router/dev/routes";
import { route, index } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("api/puck/*", "routes/api.puck.ts"),
  route("*", "routes/puck-splat.tsx"),
] satisfies RouteConfig;
