import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  Ref,
} from "react";
import { DragAxis } from "../../types";

/**
 * Props consumed by Puck internally that are shared between DropZones and slots.
 */
export type DropZoneSharedProps<ComponentType extends ElementType = "div"> = {
  allow?: string[];
  disallow?: string[];
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"] | number;
  className?: string;
  collisionAxis?: DragAxis;
  ref?: Ref<any>;
  as?: ComponentType;
};

/**
 * All props consumed by Puck for a DropZone component. `zone` lives here only.
 *
 * On slots `zone` is injected internally, so slots use {@link SlotProps} instead.
 */
export type DropZoneOwnProps<ComponentType extends ElementType = "div"> =
  DropZoneSharedProps<ComponentType> & {
    zone: string;
  };

/**
 * Unsupported additional props that are never forwarded to `as`.
 *
 * Omitted from the public types AND stripped at runtime.
 */
export type NonForwardableProps = {
  // Both removed because slot content is always rendered as children
  children?: unknown;
  dangerouslySetInnerHTML?: unknown;
};

/**
 * Keys internally consumed by Puck and never forwarded to `as`.
 */
export type ConsumedPropKey =
  | keyof DropZoneOwnProps
  | "as"
  | "content"
  | "config"
  | "metadata";

/**
 * Additional props forwarded to the element or component provided via `as`,
 * typed against it.
 *
 * Puck-internal/unsupported props are stripped so they don't leak onto the DOM.
 */
type ForwardedProps<ComponentType extends ElementType> = Omit<
  ComponentPropsWithoutRef<ComponentType>,
  ConsumedPropKey | keyof NonForwardableProps
>;

/**
 * Props for a `DropZone` component.
 *
 * Any additional props not consumed by Puck are forwarded to the element or
 * component provided via `as` (defaulting to a `div`), typed against it.
 */
export type DropZoneProps<ComponentType extends ElementType = "div"> =
  DropZoneOwnProps<ComponentType> & ForwardedProps<ComponentType>;

/**
 * Props for a `slot` render component.
 *
 * Any additional props not consumed by Puck are forwarded to the element or
 * component provided via `as` (defaulting to a `div`), typed against it.
 */
export type SlotProps<ComponentType extends ElementType = "div"> =
  DropZoneSharedProps<ComponentType> & ForwardedProps<ComponentType>;
