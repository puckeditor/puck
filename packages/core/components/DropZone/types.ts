import { CSSProperties, ElementType, Ref } from "react";
import { DragAxis } from "../../types";

export type DropZoneProps<T = string> = {
  zone: string;
  allow?: T[];
  disallow?: T[];
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"] | number;
  className?: string;
  collisionAxis?: DragAxis;
  as?: ElementType;
  ref?: Ref<any>;
};
