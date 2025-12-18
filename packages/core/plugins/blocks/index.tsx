import { Hammer } from "lucide-react";
import { PluginInternal } from "../../types/Internal";
import { Components } from "../../components/Puck/components/Components";

export const blocksPlugin: () => PluginInternal = () => ({
  __name: "blocks",
  label: "Blocks",
  render: Components,
  icon: <Hammer />,
});
