import { Viewports } from "../../types";

export const defaultViewports: Required<Viewports> = [
  { width: 360, height: "auto", icon: "Smartphone", label: "Small" },
  { width: 768, height: "auto", icon: "Tablet", label: "Medium" },
  { width: 1280, height: "auto", icon: "Monitor", label: "Large" },
  { width: "100%", height: "auto", icon: "FullWidth", label: "Full-width" },
];
