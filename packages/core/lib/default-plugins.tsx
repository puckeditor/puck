import { Hammer, Layers } from "lucide-react";
import { Components } from "../components/Puck/components/Components";
import { Outline } from "../components/Puck/components/Outline";
import { Plugin } from "../types";

export const blocksPlugin: () => Plugin = () => ({
  name: "blocks",
  label: "Blocks",
  render: Components,
  icon: <Hammer />,
});

export const outlinePlugin: () => Plugin = () => ({
  name: "outline",
  label: "Outline",
  render: Outline,
  icon: <Layers />,
});
