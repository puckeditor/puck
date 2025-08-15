import { ReactNode } from "react";

type iconTypes = "Smartphone" | "Monitor" | "Tablet";

export type Viewport = {
  width: number | "100%";
  height?: number | "auto";
  label?: string;
  icon?: iconTypes | ReactNode;
};

export type Viewports = Viewport[];
