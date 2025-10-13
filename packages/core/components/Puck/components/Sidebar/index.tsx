import React from "react";
import { ResizeHandle } from "../ResizeHandle";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Sidebar", styles);

interface SidebarProps {
  position: "left" | "right";
  sidebarRef: { current: HTMLDivElement | null };
  isVisible: boolean;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  position,
  sidebarRef,
  isVisible,
  onResize,
  onResizeEnd,
  children,
}) => {
  if (!isVisible) return null;

  return (
    <>
      <div ref={sidebarRef} className={getClassName({ [position]: true })}>
        {children}
      </div>
      <div className={`${getClassName("resizeHandle")}`}>
        <ResizeHandle
          position={position}
          sidebarRef={sidebarRef}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        />
      </div>
    </>
  );
};
