import type { Config, UserGenerics } from "@puckeditor/core";

import { resolvePuckPath } from "./resolve-puck-path";
import { sourceHash } from "./source-hash";
import type { PageSource } from "./types";

/**
 * Defines a page in code, typed against your Puck config — component names and
 * their props are checked at build time.
 *
 * The page is a seed. It renders until someone publishes an edit to the same
 * path, which forks it into the store; the store wins from then on.
 *
 * ```tsx
 * export default definePage(config, {
 *   path: "/pricing",
 *   data: { root: { props: { title: "Pricing" } }, content: [] },
 * });
 * ```
 */
export function definePage<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>(
  config: UserConfig,
  page: { path: string; data: G["UserData"] }
): PageSource<G["UserData"]> {
  if (!config || typeof config !== "object" || !config.components) {
    throw new Error(
      "[@puckeditor/router] definePage() expects your Puck config as its first argument."
    );
  }

  // Normalise up front so a page authored as `pricing` or `/pricing/` indexes
  // under the same key the router will look it up by at request time.
  const { path } = resolvePuckPath(page.path);

  const source = { path, data: page.data } as PageSource<G["UserData"]>;

  // Hashing is only needed to compare a fork against its source, so it is not
  // needed on the render path at all. Since pages are defined at module scope,
  // an eager hash would be paid on every request for every page in the barrel —
  // ~17ms for a page with a few thousand components. Compute on first read and
  // then replace the accessor with the value.
  Object.defineProperty(source, "sourceHash", {
    enumerable: true,
    configurable: true,
    get() {
      const value = sourceHash(page.data);

      Object.defineProperty(source, "sourceHash", {
        value,
        enumerable: true,
        configurable: true,
      });

      return value;
    },
  });

  return source;
}
