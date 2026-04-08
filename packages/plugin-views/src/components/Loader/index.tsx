"use client";

import type { JSX } from "react";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import styles from "./style.module.css";

const getClassName = getClassNameFactory("Loader", styles);

export function Loader({
  color,
  size = 16,
  ...props
}: {
  color?: string;
  size?: number;
} & JSX.IntrinsicAttributes) {
  return (
    <span
      aria-label="loading"
      className={getClassName()}
      style={{
        color,
        height: size,
        width: size,
      }}
      {...props}
    />
  );
}
