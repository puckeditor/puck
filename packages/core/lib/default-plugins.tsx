import { FormInput, Hammer, Layers } from "lucide-react";
import { Components } from "../components/Puck/components/Components";
import { Outline } from "../components/Puck/components/Outline";
import { Plugin } from "../types";
import { PluginInternal } from "../types/Internal";
import { Fields } from "../components/Puck/components/Fields";

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

export const fieldsPlugin: (params?: {
  mobileOnly?: boolean;
}) => PluginInternal = ({ mobileOnly = true } = {}) => ({
  name: "fields",
  label: "Fields",
  render: () => (
    <div style={{ background: "white", minHeight: "100%" }}>
      <Fields />
    </div>
  ),
  icon: <FormInput />,
  mobileOnly,
});
