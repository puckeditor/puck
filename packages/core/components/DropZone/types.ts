import { CSSProperties, ElementType, Ref } from "react";
import { DragAxis } from "../../types";

export type DropZoneProps = {
  zone: string;
  allow?: string[];
  disallow?: string[];
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"] | number;
  className?: string;
  collisionAxis?: DragAxis;
  as?: ElementType;
  ref?: Ref<any>;
};
