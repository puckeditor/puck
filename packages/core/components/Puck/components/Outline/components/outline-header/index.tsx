import { PropsWithChildren } from "react";
import { getClassNameFactory } from "../../../../../../lib";
import { useMessage } from "../../../../../../lib/use-message";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("OutlineHeader", styles);

export interface OutlineHeaderProps {
  /** The title to display in the header */
  title?: string;
}

/**
 * Renders the header of the outline component, which includes the title and any additional children.
 */
const OutlineHeader = ({
  children,
  title,
}: PropsWithChildren<OutlineHeaderProps>) => {
  const outlineHeaderMsg = useMessage("outline-header-title");

  return (
    <div className={getClassName()}>
      <div className={getClassName("title")}>{outlineHeaderMsg ?? title}</div>
      {children}
    </div>
  );
};

export default OutlineHeader;
