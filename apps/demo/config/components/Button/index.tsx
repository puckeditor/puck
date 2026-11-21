import { AnchorHTMLAttributes, ReactNode } from "react";
import { getClassNameFactory } from "@/core/lib";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Button", styles);

/**
 * Renders a link styled as a button.
 */
export const Button = ({
  children,
  variant = "primary",
  size = "medium",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "medium" | "large";
}) => (
  <a className={getClassName({ [variant]: true, [size]: true })} {...props}>
    {children}
  </a>
);
