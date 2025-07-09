import { ComponentData, RootData } from "../../types";

export const toComponent = (item: ComponentData | RootData): ComponentData => {
  return "type" in item
    ? (item as ComponentData)
    : {
        ...item,
        props: { ...item.props, id: "root" },
        type: "root",
      };
};
