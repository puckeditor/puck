import { CSSProperties, ElementType } from "react";
import { DragAxis } from "../../types";

export type DropZoneProps = {
  zone: string;
  allow?: string[];
  disallow?: string[];
  style?: CSSProperties;
  minEmptyHeight?: number;
  className?: string;
  collisionAxis?: DragAxis;
  as?: ElementType;
};
