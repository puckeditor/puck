import { ReactNode } from "react";
import { ComponentData, Config, Content, RootData } from "../types";
import { DropZoneProps } from "../components/DropZone/types";
import { useFieldTransforms } from "./field-transforms/use-field-transforms";
import { getSlotTransform } from "./field-transforms/default-transforms/slot-transform";

export function useSlots<
  T extends ComponentData | RootData,
  UserConfig extends Config
>(
  config: UserConfig,
  item: T,
  renderSlotEdit: (dzProps: DropZoneProps & { content: Content }) => ReactNode,
  renderSlotRender: (
    dzProps: DropZoneProps & { content: Content }
  ) => ReactNode = renderSlotEdit,
  readOnly?: T["readOnly"],
  forceReadOnly?: boolean
): T["props"] {
  return useFieldTransforms(
    config,
    item as ComponentData,
    getSlotTransform(renderSlotEdit, renderSlotRender),
    readOnly,
    forceReadOnly
  );
}
