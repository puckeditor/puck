import type { ReactNode } from "react";
import { Hammer } from "lucide-react";
import { Plugin } from "../../types";
import { Components } from "../../components/Puck/components/Components";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";

const getClassName = getClassNameFactory("BlocksPlugin", styles);

export type BlocksPluginProps = {
  label?: string;
  icon?: ReactNode;
};

export const blocksPlugin: (props?: BlocksPluginProps) => Plugin = (
  props = {}
) => ({
  name: "blocks",
  label: props.label ?? "Blocks",
  render: () => (
    <div className={getClassName()}>
      <Components />
    </div>
  ),
  icon: props.icon ?? <Hammer />,
});
