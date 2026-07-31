import { ReactNode } from "react";
import { getClassNameFactory } from "@/core/lib";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Color", styles);

/**
 * Renders a base color value as inline code, with a swatch preview on the left.
 */
export const Color = ({ children }: { children: ReactNode }) => {
  const value = String(children);

  return (
    <span className={getClassName()}>
      <span
        aria-hidden="true"
        className={getClassName("swatch")}
        style={{ background: value }}
      />
      <code className="nextra-code">{value}</code>
    </span>
  );
};
