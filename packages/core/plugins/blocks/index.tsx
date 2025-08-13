import { Hammer } from "lucide-react";
import { Plugin } from "../../types";
import { Components } from "../../components/Puck/components/Components";

export const blocksPlugin: () => Plugin = () => ({
  name: "blocks",
  label: "Blocks",
  render: Components,
  icon: <Hammer />,
});
