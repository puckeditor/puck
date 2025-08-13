import { Layers } from "lucide-react";
import { Outline } from "../../components/Puck/components/Outline";
import { Plugin } from "../../types";

export const outlinePlugin: () => Plugin = () => ({
  name: "outline",
  label: "Outline",
  render: Outline,
  icon: <Layers />,
});
