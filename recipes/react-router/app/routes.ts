import type { RouteConfig } from "@react-router/dev/routes";
import { route, index } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("*", "routes/puck-splat.tsx"),
] satisfies RouteConfig;
