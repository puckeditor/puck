import {
  ComponentData,
  Config,
  Content,
  RootData,
  UserGenerics,
} from "../../types";
import { mapSlots } from "./map-slots";

type WalkTreeOptions = {
  parentId: string;
  propName: string;
};

export function walkTree<
  T extends ComponentData | RootData | G["UserData"],
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>(
  data: T,
  config: UserConfig,
  callbackFn: (data: Content, options: WalkTreeOptions) => Content | null | void
): T {
  const walkItem = <
    ItemType extends
      | G["UserComponentData"]
      | G["UserData"]["root"]
      | G["UserData"]
  >(
    item: ItemType
  ): ItemType => {
    return mapSlots(
      item as ComponentData,
      (content, parentId, propName) => {
        return callbackFn(content, { parentId, propName }) ?? content;
      },
      config,
      true
    ) as ItemType;
  };

  if ("props" in data) {
    return walkItem(data as any) as T;
  }

  const _data = data as G["UserData"];
  const zones = _data.zones ?? {};

  const mappedContent = _data.content.map(walkItem) as ComponentData[];

  return {
    root: walkItem(_data.root),
    content:
      callbackFn(mappedContent, {
        parentId: "root",
        propName: "default-zone",
      }) ?? mappedContent,
    zones: Object.keys(zones).reduce(
      (acc, zoneCompound) => ({
        ...acc,
        [zoneCompound]: zones[zoneCompound].map(walkItem),
      }),
      {}
    ),
  } as T;
}
