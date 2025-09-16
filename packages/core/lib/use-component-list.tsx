import { ReactNode, useEffect, useState } from "react";
import { ComponentList } from "../components/ComponentList";
import { useAppStore } from "../store";

export const useComponentList = () => {
  const [componentList, setComponentList] = useState<ReactNode[]>();
  const config = useAppStore((s) => s.config);
  const uiComponentList = useAppStore((s) => s.state.ui.componentList);

  useEffect(() => {
    if (Object.keys(uiComponentList).length > 0) {
      const matchedComponents: string[] = [];

      let _componentList: ReactNode[];

      _componentList = Object.entries(uiComponentList).map(
        ([categoryKey, category]) => {
          if (!category.components) {
            return null;
          }

          category.components.forEach((componentName) => {
            matchedComponents.push(componentName as string);
          });

          if (category.visible === false) {
            return null;
          }

          return (
            <ComponentList
              id={categoryKey}
              key={categoryKey}
              title={category.title || categoryKey}
            >
              {category.components.map((componentName, i) => {
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
      );

      const remainingComponents = Object.keys(config.components).filter(
        (component) => matchedComponents.indexOf(component) === -1
      );

      if (
        remainingComponents.length > 0 &&
        !uiComponentList.other?.components &&
        uiComponentList.other?.visible !== false
      ) {
        _componentList.push(
          <ComponentList
            id="other"
            key="other"
            title={uiComponentList.other?.title || "Other"}
          >
            {remainingComponents.map((componentName, i) => {
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

      setComponentList(_componentList);
    }
  }, [config.categories, config.components, uiComponentList]);

  return componentList;
};
