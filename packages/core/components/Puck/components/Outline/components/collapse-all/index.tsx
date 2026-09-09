import { ChevronsDownUp } from "lucide-react";

import getClassNameFactory from "../../../../../../lib/get-class-name-factory";
import mergeClassNames from "../../../../../../lib/merge-class-names";
import { useMessage } from "../../../../../../lib/use-message";

import { useAppStore } from "../../../../../../store";

import { IconButton } from "../../../../../IconButton";

import styles from "./styles.module.css";

export interface CollapseAllProps {
  className?: string;
  /** Callback invoked when the collapse all button is clicked */
  onClick?: () => void;
  /** If there are any expanded items in the outline or not */
  hasExpandedItems?: boolean;
}

const getClassName = getClassNameFactory("CollapseAll", styles);

/**
 * Renders a button to collapse all layers in the outline.
 */
function CollapseAll({ className }: CollapseAllProps) {
  const hasExpandedItems = useAppStore(
    (s) => Object.keys(s.state.ui.itemExpanded ?? {}).length > 0
  );
  const dispatch = useAppStore((s) => s.dispatch);

  const collapseAllMsg = useMessage("outline-header-collapseall");

  const collapseAll = () => {
    dispatch({ type: "setUi", ui: { itemExpanded: {} } });
  };

  return (
    <div
      className={mergeClassNames(
        getClassName({ visible: hasExpandedItems }),
        className
      )}
    >
      <IconButton title={collapseAllMsg} onClick={collapseAll}>
        <ChevronsDownUp className={getClassName("icon")} />
      </IconButton>
    </div>
  );
}

export default CollapseAll;
