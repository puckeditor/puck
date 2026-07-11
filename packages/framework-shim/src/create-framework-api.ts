import type { Config } from "./core";
import type { FrameworkAdapter } from "./adapter";
import { createComponentBridge } from "./create-component-bridge";
import { createFieldBridge } from "./create-field-bridge";
import { createTransformConfig } from "./create-transform-config";
import { markBridged } from "./bridge-marker";

/**
 * Build a framework package's whole config-transform API from its adapter
 * factory. `Opts` is the framework's per-call wrap options (e.g. Vue's
 * `{ appContext }`, Svelte's `{ context }`), threaded verbatim to the adapter.
 *
 * Returns:
 *  - `transformConfig(config, opts)` — framework config → core `Config`;
 *  - `transformFieldTypes(fieldTypes, opts)` — framework components →
 *    `overrides.fieldTypes`;
 *  - `defineComponent(component, opts)` / `defineField(component, opts)` —
 *    per-component/field escape hatches for mixed configs. Their output is
 *    marked, so the walker never double-wraps it.
 */
export const createFrameworkApi = <Opts extends Record<string, any>>(
  makeAdapter: (opts: Opts) => FrameworkAdapter
) => {
  const { transformConfig: walkConfig, transformFieldTypes: walkFieldTypes } =
    createTransformConfig<Opts>({
      wrapComponent: (render, bridgeOpts, opts) =>
        createComponentBridge(makeAdapter(opts), render, bridgeOpts),
      wrapField: (render, opts) => createFieldBridge(makeAdapter(opts), render),
    });

  return {
    transformConfig: (frameworkConfig: any, options: Opts): Config =>
      walkConfig(frameworkConfig, options),

    transformFieldTypes: (
      fieldTypes: Record<string, any>,
      options: Opts
    ): Record<string, any> => walkFieldTypes(fieldTypes, options),

    defineComponent: (
      component: unknown,
      options: Opts & { slotPropNames?: string[]; isRoot?: boolean }
    ) =>
      markBridged(
        createComponentBridge(makeAdapter(options), component, {
          slotPropNames: options.slotPropNames,
          isRoot: options.isRoot,
        })
      ),

    defineField: (component: unknown, options: Opts) =>
      markBridged(createFieldBridge(makeAdapter(options), component)),
  };
};
