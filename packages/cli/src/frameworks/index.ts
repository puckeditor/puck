import type { FrameworkId, FrameworkInfo } from "../detect/framework";
import type { FrameworkAdapter } from "./adapter";
import { nextAdapter } from "./next";
import { vinextAdapter } from "./vinext";
import { reactRouterAdapter } from "./react-router";
import { tanstackStartAdapter } from "./tanstack-start";
import { expressAdapter, honoAdapter } from "./server";

export const ADAPTERS: {
  [K in FrameworkId]: FrameworkAdapter<Extract<FrameworkInfo, { id: K }>>;
} = {
  next: nextAdapter,
  "react-router": reactRouterAdapter,
  "tanstack-start": tanstackStartAdapter,
  vinext: vinextAdapter,
  hono: honoAdapter,
  express: expressAdapter,
};

export const adapterFor = <I extends FrameworkInfo>(info: I) =>
  ADAPTERS[info.id] as unknown as FrameworkAdapter<I>;
