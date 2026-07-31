import { CSSProperties, ElementType, Ref } from "react";
import { DragAxis } from "../../types";

export type DropZoneProps<AvailableComponents extends string = string> = {
  zone: string;
  allow?: AvailableComponents[];
  disallow?: AvailableComponents[];
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"] | number;
  className?: string;
  collisionAxis?: DragAxis;
  as?: ElementType;
  ref?: Ref<any>;
};
