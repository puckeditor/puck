import { ReactNode } from "react";
import { ComponentData, Config, Content, RootData } from "../types";
import { DropZoneProps } from "../components/DropZone/types";
import { useFieldTransforms } from "./field-transforms/use-field-transforms";
import { getSlotTransform } from "./field-transforms/default-transforms/slot-transform";
import { FieldTransforms } from "../types/API/FieldTransforms";

/**
 * Converts the item slot props to ReactNodes, applies any transforms to them, and returns them.
 * 
 * @param config The Puck config used to build the item
 * @param item The component or root data to resolve props for
 * @param renderSlot A function that converts slot component data to a ReactNode.
 * @param fieldTransforms Field transforms to apply while rendering the final page props.
 * @returns The props for the item, with slot props converted to ReactNodes and any field transforms applied.
 */
export function useSlots<
  T extends ComponentData | RootData,
  UserConfig extends Config
>(
  config: UserConfig,
  item: T,
  renderSlot: (dzProps: DropZoneProps & { content: Content }) => ReactNode,
  fieldTransforms?: FieldTransforms
): T["props"] {
  return useFieldTransforms(
    config,
    item as ComponentData,
    { ...getSlotTransform(renderSlot), ...fieldTransforms },
    undefined,
    true
  );
}
