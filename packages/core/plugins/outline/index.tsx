import { Layers } from "lucide-react";
import { Outline } from "../../components/Puck/components/Outline";
import { PluginInternal } from "../../types/Internal";

export const outlinePlugin: () => PluginInternal = () => ({
  __name: "outline",
  label: "Outline",
  render: Outline,
  icon: <Layers />,
});
