import { ReactNode, useEffect, useState } from "react";
import { ComponentList } from "../components/ComponentList";
import { useAppStore } from "../store";

export const useComponentList = (visible?: Set<string>) => {
  const [componentList, setComponentList] = useState<ReactNode[]>();
  const config = useAppStore((s) => s.config);
  const uiComponentList = useAppStore((s) => s.state.ui.componentList);

  useEffect(() => {
    if (Object.keys(uiComponentList).length === 0) return;

    const matched: string[] = [];
    const lists: ReactNode[] = [];

    for (const [categoryKey, category] of Object.entries(uiComponentList)) {
      if (!category || category.visible === false) continue;
      if (!category.components) continue;

      const comps = visible
        ? category.components.filter((c) => visible.has(c as string))
        : category.components;

      // Hide empty groups while searching
      if (visible && comps.length === 0) continue;

      comps.forEach((name) => matched.push(name as string));

      lists.push(
        <ComponentList
          id={categoryKey}
          key={categoryKey}
          title={category.title || categoryKey}
        >
          {comps.map((componentName, i) => {
            const componentConf = config.components[componentName] || {};
            return (
              <ComponentList.Item
                key={componentName}
                label={(componentConf["label"] ?? componentName) as string}
                name={componentName as string}
                index={i}
              />
            );
          })}
        </ComponentList>
      );
    }

    // "Other" bucket
    const remaining = Object.keys(config.components).filter(
      (c) => matched.indexOf(c) === -1 && (visible ? visible.has(c) : true)
    );

    if (
      remaining.length > 0 &&
      !uiComponentList.other?.components &&
      uiComponentList.other?.visible !== false
    ) {
      lists.push(
        <ComponentList
          id="other"
          key="other"
          title={uiComponentList.other?.title || "Other"}
        >
          {remaining.map((componentName, i) => {
            const componentConf = config.components[componentName] || {};
            return (
              <ComponentList.Item
                key={componentName}
                name={componentName as string}
                label={(componentConf["label"] ?? componentName) as string}
                index={i}
              />
            );
          })}
        </ComponentList>
      );
    }

    setComponentList(lists);
    // Important: depend on visible by identity. Memoize visible in wrapper.
  }, [config.categories, config.components, uiComponentList, visible]);

  return componentList;
};
