import type { Config, Fields } from "./core";

/**
 * Prop names for a component that must be bridged via the outlet/portal protocol
 * rather than passed as plain props, because their value is a Preact node the
 * host framework can't render as a prop:
 *
 *  - **slot** fields — arrive as a render function (a DropZone thunk);
 *  - **contentEditable** text/textarea/custom fields — core's inline-text
 *    transform swaps the string for an `<InlineTextField>` Preact element in the
 *    editor (a plain string in `<Render>`). Either way it's portaled; the bridge
 *    wraps the non-function value in a thunk.
 *
 * The host component renders these the same way it renders a slot (Vue:
 * `<component :is="name" />`; Svelte: `<PuckSlot name>` / `<PuckText name>`).
 */
const getOutletPropNames = (fields?: Fields): string[] => {
  if (!fields) return [];
  return Object.keys(fields).filter((name) => {
    const field = (fields as Record<string, any>)[name];
    if (!field || typeof field !== "object") return false;
    if (field.type === "slot") return true;
    return (
      (field.type === "text" ||
        field.type === "textarea" ||
        field.type === "custom") &&
      field.contentEditable === true
    );
  });
};

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
 * component/field wrappers. Framework-agnostic walker: derives slot prop names,
 * sets `inline: true`, replaces `render` with the framework bridge, and walks
 * `fields` (recursively through object/array) wrapping any `type: "custom"`
 * framework field renders. All other config keys pass through untouched.
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
      return { ...field, render: wrapField(field.render, wrapOptions) };
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

  const transformConfig = (
    frameworkConfig: any,
    wrapOptions: WrapOptions
  ): Config => {
    const components: Record<string, any> = {};

    for (const name in frameworkConfig.components) {
      const { render, fields, ...rest } = frameworkConfig.components[name];
      const slotPropNames = getOutletPropNames(fields as Fields | undefined);

      components[name] = {
        ...rest,
        ...(fields ? { fields: walkFields(fields, wrapOptions) } : {}),
        inline: true,
        render: wrapComponent(render, { slotPropNames }, wrapOptions),
      };
    }

    const config: Config = { components };

    if (frameworkConfig.categories) {
      (config as any).categories = frameworkConfig.categories;
    }

    if (frameworkConfig.root) {
      const {
        render: rootRender,
        fields: rootFields,
        ...rootRest
      } = frameworkConfig.root;
      const rootSlotPropNames = getOutletPropNames(
        rootFields as Fields | undefined
      );

      config.root = {
        ...rootRest,
        ...(rootFields ? { fields: walkFields(rootFields, wrapOptions) } : {}),
        ...(rootRender
          ? {
              render: wrapComponent(
                rootRender,
                { slotPropNames: rootSlotPropNames, isRoot: true },
                wrapOptions
              ),
            }
          : {}),
      } as Config["root"];
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
      out[type] = wrapField(fieldTypes[type], wrapOptions);
    }
    return out;
  };

  return { transformConfig, transformFieldTypes };
};
