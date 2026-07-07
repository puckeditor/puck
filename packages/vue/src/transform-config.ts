import type { Config, Fields, Field } from "./core";
import type {
  VueConfig,
  VueComponent,
  TransformConfigOptions,
} from "./types";
import {
  wrapVueComponent,
  type WrapVueComponentOptions,
} from "./bridge/wrap-vue-component";
import { wrapVueField, type WrapVueFieldOptions } from "./bridge/wrap-vue-field";

/**
 * Slot prop names for a component = the field names whose field `type` is
 * `"slot"`. These props arrive as render functions and are bridged via the
 * outlet/portal protocol rather than passed as plain reactive props.
 */
const getSlotPropNames = (fields?: Fields): string[] => {
  if (!fields) return [];
  return Object.keys(fields).filter(
    (name) => (fields as Record<string, any>)[name]?.type === "slot"
  );
};

/** Wrap a `type: "custom"` field's Vue `render`; recurse into object/array. */
const walkField = (field: any, appContext: WrapVueFieldOptions["appContext"]) => {
  if (!field || typeof field !== "object") return field;

  if (field.type === "custom" && field.render) {
    return {
      ...field,
      render: wrapVueField(field.render as VueComponent, { appContext }),
    };
  }

  if (field.type === "object" && field.objectFields) {
    return { ...field, objectFields: walkFields(field.objectFields, appContext) };
  }

  if (field.type === "array" && field.arrayFields) {
    return { ...field, arrayFields: walkFields(field.arrayFields, appContext) };
  }

  return field;
};

const walkFields = (
  fields: Record<string, any> | undefined,
  appContext: WrapVueFieldOptions["appContext"]
): Record<string, any> | undefined => {
  if (!fields) return fields;
  const out: Record<string, any> = {};
  for (const name in fields) out[name] = walkField(fields[name], appContext);
  return out;
};

/**
 * Per-component escape hatch: wrap a single Vue component into a Puck-compatible
 * `render`, for mixed React/Vue configs.
 */
export const defineVueComponent = (
  component: VueComponent,
  options: WrapVueComponentOptions = {}
) => wrapVueComponent(component, options);

/**
 * Per-field escape hatch: wrap a single Vue component into a Puck-compatible
 * custom-field `render` (or `fieldTypes` override), for mixed configs.
 */
export const defineVueField = (
  component: VueComponent,
  options: WrapVueFieldOptions = {}
) => wrapVueField(component, options);

/**
 * Convert a Vue `VueConfig` into a core `Config`.
 *
 * For each component (and `root`): derives slot prop names from `fields`, sets
 * `inline: true`, replaces `render` with the Vue bridge, and walks `fields`
 * (recursively through object/array) wrapping any `type: "custom"` Vue field
 * renders. All other config keys pass through untouched.
 */
export const transformConfig = (
  vueConfig: VueConfig,
  options: TransformConfigOptions = {}
): Config => {
  const { appContext = null } = options;

  const components: Record<string, any> = {};

  for (const name in vueConfig.components) {
    const { render, fields, ...rest } = vueConfig.components[name] as any;
    const slotPropNames = getSlotPropNames(fields as Fields | undefined);

    components[name] = {
      ...rest,
      ...(fields ? { fields: walkFields(fields, appContext) } : {}),
      inline: true,
      render: wrapVueComponent(render, { appContext, slotPropNames }),
    };
  }

  const config: Config = { components };

  if (vueConfig.categories) {
    (config as any).categories = vueConfig.categories;
  }

  if (vueConfig.root) {
    const { render: rootRender, fields: rootFields, ...rootRest } =
      vueConfig.root as any;
    const rootSlotPropNames = getSlotPropNames(rootFields as Fields | undefined);

    config.root = {
      ...rootRest,
      ...(rootFields ? { fields: walkFields(rootFields, appContext) } : {}),
      ...(rootRender
        ? {
            render: wrapVueComponent(rootRender, {
              appContext,
              slotPropNames: rootSlotPropNames,
              isRoot: true,
            }),
          }
        : {}),
    } as Config["root"];
  }

  return config;
};

/**
 * Wrap a map of Vue components into `overrides.fieldTypes` (replacing built-in
 * field UIs). Used by `<Puck>`'s `fieldTypes` prop.
 */
export const transformFieldTypes = (
  fieldTypes: Record<string, VueComponent>,
  options: WrapVueFieldOptions = {}
): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const type in fieldTypes) {
    out[type] = wrapVueField(fieldTypes[type], options);
  }
  return out;
};

export type { Field };
