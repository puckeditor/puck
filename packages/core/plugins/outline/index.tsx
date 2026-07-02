import type { ReactNode } from "react";
import { Layers } from "lucide-react";
import { Outline } from "../../components/Puck/components/Outline";
import { Plugin } from "../../types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";

const getClassName = getClassNameFactory("OutlinePlugin", styles);

export type OutlinePluginProps = {
  label?: string;
  icon?: ReactNode;
};

export const outlinePlugin: (props?: OutlinePluginProps) => Plugin = (
  props = {}
) => ({
  name: "outline",
  label: props.label ?? "Outline",
  render: () => (
    <div className={getClassName()}>
      <Outline />
    </div>
  ),
  icon: props.icon ?? <Layers />,
});
