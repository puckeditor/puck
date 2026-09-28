import type { FrameworkId, FrameworkInfo } from "../detect/framework";
import type { FrameworkAdapter } from "./adapter";
import { nextAdapter } from "./next";
import { reactRouterAdapter } from "./react-router";

export const ADAPTERS: {
  [K in FrameworkId]: FrameworkAdapter<Extract<FrameworkInfo, { id: K }>>;
} = {
  next: nextAdapter,
  "react-router": reactRouterAdapter,
};

export const adapterFor = <I extends FrameworkInfo>(info: I) =>
  ADAPTERS[info.id] as unknown as FrameworkAdapter<I>;
