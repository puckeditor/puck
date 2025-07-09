import { ComponentData, ComponentDataOptionalId, Config } from "../../types";
import { generateId } from "../generate-id";
import { walkTree } from "./walk-tree";

export const populateIds = (
  data: ComponentData,
  config: Config,
  override: boolean = false
): ComponentData => {
  const id = generateId(data.type);

  return walkTree(
    {
      ...data,
      props: override ? { ...data.props, id } : { ...data.props },
    },
    config,
    (contents) =>
      contents.map((item: ComponentDataOptionalId) => {
        const id = generateId(item.type);

        return {
          ...item,
          props: override ? { ...item.props, id } : { id, ...item.props },
        };
      })
  );
};
