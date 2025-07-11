import { ComponentData, Config, RootData } from "../types";
import { toComponent } from "./data/to-component";

export const getConfig = (item: ComponentData | RootData, config: Config) => {
  const componentItem = toComponent(item);

  return componentItem.type !== "root"
    ? config.components[componentItem.type]
    : config.root;
};
