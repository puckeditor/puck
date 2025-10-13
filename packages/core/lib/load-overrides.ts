import { Overrides, Plugin } from "../types";

export const loadOverrides = ({
  overrides,
  plugins,
}: {
  overrides?: Partial<Overrides>;
  plugins?: Plugin[];
}) => {
  const collected: Partial<Overrides> = { ...overrides };

  plugins?.forEach((plugin) => {
    if (!plugin.overrides) return;

    Object.keys(plugin.overrides).forEach((_overridesType) => {
      const overridesType = _overridesType as keyof Overrides;

      if (!plugin.overrides?.[overridesType]) return;

      if (overridesType === "fieldTypes") {
        const fieldTypes = plugin.overrides.fieldTypes!;
        Object.keys(fieldTypes).forEach((fieldType) => {
          collected.fieldTypes = collected.fieldTypes || {};

          const childNode = collected.fieldTypes[fieldType];

          const Comp = (props: any) =>
            fieldTypes[fieldType]!({
              ...props,
              children: childNode ? childNode(props) : props.children,
            });

          collected.fieldTypes[fieldType] = Comp;
        });

        return;
      }

      const childNode = collected[overridesType];

      const Comp = (props: any) =>
        plugin.overrides![overridesType]!({
          ...props,
          children: childNode ? childNode(props) : props.children,
        });

      collected[overridesType] = Comp;
    });
  });

  return collected;
};
