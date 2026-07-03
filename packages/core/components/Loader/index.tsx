import type { JSX } from "react";
import { getClassNameFactory } from "../../lib";
import styles from "./styles.module.css";
import { useMessage } from "../../lib/use-message";

const getClassName = getClassNameFactory("Loader", styles);

export const Loader = ({
  color,
  size = 16,
  ...props
}: {
  color?: string;
  size?: number;
} & JSX.IntrinsicAttributes) => {
  const loadingLabel = useMessage("loader-loading");

  return (
    <span
      className={getClassName()}
      style={{
        width: size,
        height: size,
        color,
      }}
      aria-label={loadingLabel}
      {...props}
    />
  );
};
