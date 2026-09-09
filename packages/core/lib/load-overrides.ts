import { FunctionComponent } from "react";
import { Overrides, Plugin } from "../types";
import { isFieldTypeHidden } from "./overrides/field-types";

/**
 * Curries the current plugin's override with the previous plugin's override
 * (renders the previous plugin's override as children of the current plugin's override).
 *
 * @param override The current plugin's override function
 * @param previousPluginOverride The previous plugin's override function (with any previous plugin's overrides already composed)
 * @returns A new override that composes the two overrides together
 */
const curryPluginOverrides = (
  override?: FunctionComponent<any> | null,
  previousPluginOverride?: FunctionComponent<any> | null
) => {
  const Comp = (props: any) => {
    // Render the previous plugin if it exists
    const children = previousPluginOverride
      ? previousPluginOverride(props)
      : props.children;

    // Render this plugin's override if it exists, passing the previous plugin's override as children
    if (override) {
      return override({
        ...props,
        children,
      });
    }

    // Otherwise just return the previous plugins override (or the original children if there were no previous plugins)
    return children;
  };

  return Comp;
};

export const loadOverrides = ({
  overrides,
  plugins,
}: {
  overrides?: Partial<Overrides>;
  plugins?: Plugin[];
}) => {
  const collected: Partial<Overrides> = {
    ...overrides,
  };

  if (overrides?.fieldTypes) collected.fieldTypes = { ...overrides.fieldTypes };

  const prevFieldTypesOverride: NonNullable<Overrides["fieldTypes"]> = {
    ...overrides?.fieldTypes,
  };

  plugins?.forEach((plugin) => {
    if (!plugin.overrides) return;

    Object.keys(plugin.overrides).forEach((_overridesType) => {
      const overridesType = _overridesType as keyof Overrides;

      if (!plugin.overrides?.[overridesType]) return;

      if (overridesType === "fieldTypes") {
        const currPluginFieldTypes = plugin.overrides!.fieldTypes!;

        Object.keys(currPluginFieldTypes).forEach((fieldType) => {
          collected.fieldTypes = collected.fieldTypes || {};

          // This plugin overrides is hiding this field type,
          // hide it regardless of any previous plugin's override.
          if (isFieldTypeHidden(currPluginFieldTypes, fieldType)) {
            collected.fieldTypes[fieldType] = null;
            return;
          }

          const prevNonNullPluginFieldType = prevFieldTypesOverride[fieldType];
          const currPluginFieldType = currPluginFieldTypes[fieldType];

          const Comp = curryPluginOverrides(
            currPluginFieldType,
            prevNonNullPluginFieldType
          );

          collected.fieldTypes[fieldType] = Comp;
          prevFieldTypesOverride[fieldType] = Comp;
        });

        return;
      }

      const childNode = collected[overridesType];

      const Comp = curryPluginOverrides(
        plugin.overrides[overridesType],
        childNode
      );

      collected[overridesType] = Comp;
    });
  });

  return collected;
};
