import getClassNameFactory from "../../../../lib/get-class-name-factory";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("DropLine", styles);

/**
 * Renders the drop line. Should be used inside a relatively-positioned
 * drop target.
 */
export const DropLine = ({
  edge,
  outset,
}: {
  /** Which edge of the target the line sits on */
  edge: "top" | "bottom";
  /** Shift the line outside the target, into the gap between rows */
  outset?: boolean;
}) => (
  <div
    className={getClassName({
      top: edge === "top",
      bottom: edge === "bottom",
      outset: Boolean(outset),
    })}
  />
);
