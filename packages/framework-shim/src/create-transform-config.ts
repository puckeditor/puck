import { getNodePropNames } from "./get-node-prop-names";
import type { Config, Fields } from "./core";
import { isBridged, markBridged } from "./bridge-marker";

export type CreateTransformConfigDeps<WrapOptions> = {
  /** Wrap a component's `render` into a Puck-compatible Preact `render`. */
  wrapComponent: (
    render: any,
    opts: { slotPropNames: string[]; isRoot?: boolean },
    wrapOptions: WrapOptions
  ) => any;
  /** Wrap a custom field / fieldTypes override `render`. */
  wrapField: (render: any, wrapOptions: WrapOptions) => any;
};

/**
 * Build a framework's `transformConfig` / `transformFieldTypes` from its
 * component/field wrappers. Framework-agnostic walker: derives outlet prop
 * names (core's node-valued fields — slots, richtext, contentEditable text:
 * `getNodePropNames`), sets `inline: true`, replaces `render` with the
 * framework bridge, and walks `fields` (recursively through object/array)
 * wrapping any `type: "custom"` framework field renders. `resolveFields` is
 * wrapped so fields it returns at runtime are walked the same way. All other
 * config keys pass through untouched.
 *
 * `WrapOptions` is the framework's per-call wrap options (e.g. Vue's
 * `{ appContext }`), threaded verbatim to `wrapComponent` / `wrapField`.
 */
export const createTransformConfig = <WrapOptions>(
  deps: CreateTransformConfigDeps<WrapOptions>
) => {
  const { wrapComponent, wrapField } = deps;

  const walkField = (field: any, wrapOptions: WrapOptions): any => {
    if (!field || typeof field !== "object") return field;

    if (field.type === "custom" && field.render) {
      // Skip renders that are already bridged: core hands *transformed* fields
      // back to `resolveFields` resolvers, which may return them unchanged.
      if (isBridged(field.render)) return field;
      return {
        ...field,
        render: markBridged(wrapField(field.render, wrapOptions)),
      };
    }
    if (field.type === "object" && field.objectFields) {
      return {
        ...field,
        objectFields: walkFields(field.objectFields, wrapOptions),
      };
    }
    if (field.type === "array" && field.arrayFields) {
      return {
        ...field,
        arrayFields: walkFields(field.arrayFields, wrapOptions),
      };
    }
    return field;
  };

  const walkFields = (
    fields: Record<string, any> | undefined,
    wrapOptions: WrapOptions
  ): Record<string, any> | undefined => {
    if (!fields) return fields;
    const out: Record<string, any> = {};
    for (const name in fields) out[name] = walkField(fields[name], wrapOptions);
    return out;
  };

  /**
   * Wrap a `resolveFields` resolver so the fields it returns at runtime pass
   * through the same walk as static config fields (core awaits resolvers, so
   * always returning a promise is safe).
   */
  const wrapResolveFields =
    (resolveFields: any, wrapOptions: WrapOptions) =>
    async (...args: any[]) =>
      walkFields(await resolveFields(...args), wrapOptions);

  const transformComponent = (
    componentConfig: any,
    wrapOptions: WrapOptions,
    isRoot: boolean
  ) => {
    const { render, fields, resolveFields, ...rest } = componentConfig;
    const slotPropNames = getNodePropNames(fields as Fields | undefined);

    return {
      ...rest,
      ...(fields ? { fields: walkFields(fields, wrapOptions) } : {}),
      ...(resolveFields
        ? { resolveFields: wrapResolveFields(resolveFields, wrapOptions) }
        : {}),
      ...(render
        ? {
            // `inline` only applies to draggable components, not the root.
            ...(isRoot ? {} : { inline: true }),
            // Skip renders already bridged via `defineComponent` (or a prior
            // transform) — double-wrapping would mount a bridge inside a
            // bridge.
            render: isBridged(render)
              ? render
              : markBridged(
                  wrapComponent(render, { slotPropNames, isRoot }, wrapOptions)
                ),
          }
        : {}),
    };
  };

  const transformConfig = (
    frameworkConfig: any,
    wrapOptions: WrapOptions
  ): Config => {
    // Unknown top-level keys (categories, future additions) pass through.
    const { components: rawComponents, root: rawRoot, ...rest } =
      frameworkConfig;

    const components: Record<string, any> = {};
    for (const name in rawComponents) {
      components[name] = transformComponent(
        rawComponents[name],
        wrapOptions,
        false
      );
    }

    const config: Config = { ...rest, components };

    if (rawRoot) {
      config.root = transformComponent(
        rawRoot,
        wrapOptions,
        true
      ) as Config["root"];
    }

    return config;
  };

  /**
   * Wrap a map of framework components into `overrides.fieldTypes` (replacing
   * built-in field UIs). Used by `<Puck>`'s `fieldTypes` prop.
   */
  const transformFieldTypes = (
    fieldTypes: Record<string, any>,
    wrapOptions: WrapOptions
  ): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const type in fieldTypes) {
      out[type] = isBridged(fieldTypes[type])
        ? fieldTypes[type]
        : markBridged(wrapField(fieldTypes[type], wrapOptions));
    }
    return out;
  };

  return { transformConfig, transformFieldTypes };
};
