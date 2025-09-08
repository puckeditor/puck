import { CSSProperties } from "react";
import { DragAxis } from "../../types";

export type DropZoneProps = {
  zone: string;
  allow?: string[];
  disallow?: string[];
  style?: CSSProperties;
  minEmptyHeight?: CSSProperties["minHeight"];
  className?: string;
  collisionAxis?: DragAxis;
};
