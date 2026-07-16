import {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  Ref,
} from "react";
import { DragAxis } from "../../types";

export type DropZoneOwnProps = {
  zone: string;
  allow?: string[];
  disallow?: string[];
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"] | number;
  className?: string;
  collisionAxis?: DragAxis;
  ref?: Ref<any>;
};

/**
 * Props for a slot or DropZone.
 *
 * Any additional props not consumed by Puck are forwarded to the element or
 * component provided via `as` (defaulting to a `div`), typed against it.
 */
export type DropZoneProps<T extends ElementType = "div"> = DropZoneOwnProps & {
  as?: T;
} & Omit<
    ComponentPropsWithoutRef<T>,
    keyof DropZoneOwnProps | "as" | "content"
  >;
