"use client";

import type { ReactNode } from "react";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import styles from "./style.module.css";
import { Loader } from "../Loader";

const getClassName = getClassNameFactory("SidebarSection", styles);

export function SidebarSection({
  children,
  title,
  noBorderTop,
  isLoading,
}: {
  children: ReactNode;
  title: ReactNode;
  noBorderTop?: boolean;
  isLoading?: boolean | null;
}) {
  return (
    <div className={getClassName({ noBorderTop })}>
      <div className={getClassName("title")}>
        <h2 className={getClassName("heading")}>{title}</h2>
      </div>
      <div className={getClassName("content")}>{children}</div>
      {isLoading ? (
        <div className={getClassName("loadingOverlay")}>
          <Loader size={32} />
        </div>
      ) : null}
    </div>
  );
}
