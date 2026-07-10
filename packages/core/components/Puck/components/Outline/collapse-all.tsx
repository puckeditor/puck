import { ChevronsDownUp } from "lucide-react";

import getClassNameFactory from "../../../../lib/get-class-name-factory";

import { useAppStore } from "../../../../store";
import { IconButton } from "../../../IconButton";

import styles from "./styles.module.css";

export interface CollapseAllProps {
  className?: string;
}

const getClassName = getClassNameFactory("CollapseAll", styles);

const mergeClassNames = (className?: string) =>
  [getClassName(), className].filter(Boolean).join(" ");

/**
 * Renders a button to collapse all layers in the outline.
 */
function CollapseAll({ className }: CollapseAllProps) {
  const dispatch = useAppStore((s) => s.dispatch);

  const collapseLayers = () => {
    dispatch({ type: "setUi", ui: { itemExpanded: {} } });
  };

  return (
    <div className={mergeClassNames(className)}>
      <IconButton
        title="Collapse all"
        variant="secondary"
        onClick={collapseLayers}
      >
        <ChevronsDownUp className={getClassName("icon")} />
      </IconButton>
    </div>
  );
}

export default CollapseAll;
