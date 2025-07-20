import { ReactNode } from "react";
import { ComponentData, Config, Content, RootData } from "../types";
import { DropZoneProps } from "../components/DropZone/types";
import { useTransformedProps } from "./transforms/use-transformed-props";
import { getSlotTransform } from "./transforms/default-transforms";

export function useSlots<T extends ComponentData | RootData>(
  config: Config,
  item: T,
  renderSlotEdit: (dzProps: DropZoneProps & { content: Content }) => ReactNode,
  renderSlotRender: (
    dzProps: DropZoneProps & { content: Content }
  ) => ReactNode = renderSlotEdit,
  readOnly?: T["readOnly"],
  forceReadOnly?: boolean
): T["props"] {
  return useTransformedProps(
    config,
    item,
    getSlotTransform(renderSlotEdit, renderSlotRender),
    readOnly,
    forceReadOnly
  );
}
