import React, { useCallback, useEffect, useRef } from "react";
import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import "./styles.css";
import { useCanvasFrame } from "../../../../lib/frame-context";
import { useResetAutoZoom } from "../../../../lib";

const getClassName = getClassNameFactory("ResizeHandle", styles);

interface ResizeHandleProps {
  position: "left" | "right";
  sidebarRef: { current: HTMLDivElement | null };
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  position,
  sidebarRef,
  onResize,
  onResizeEnd,
}) => {
  const { frameRef } = useCanvasFrame();
  const resetAutoZoom = useResetAutoZoom(frameRef);

  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      const delta = e.clientX - startX.current;
      const newWidth =
        position === "left"
          ? startWidth.current + delta
          : startWidth.current - delta;

      const width = Math.max(192, newWidth);
      onResize(width);
      e.preventDefault();
    },
    [onResize, position]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const overlay = document.getElementById("resize-overlay");
    if (overlay) {
      document.body.removeChild(overlay);
    }

    // Remove event listeners when dragging ends
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    const finalWidth = sidebarRef.current?.getBoundingClientRect().width || 0;
    onResizeEnd(finalWidth);

    resetAutoZoom();
  }, [onResizeEnd]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;

      startWidth.current =
        sidebarRef.current?.getBoundingClientRect().width || 0;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const overlay = document.createElement("div");
      overlay.id = "resize-overlay";
      overlay.setAttribute("data-resize-overlay", "");
      document.body.appendChild(overlay);

      // Add event listeners only when dragging starts
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      e.preventDefault();
    },
    [position, handleMouseMove, handleMouseUp]
  );

  return (
    <div
      ref={handleRef}
      className={getClassName({ [position]: true })}
      onMouseDown={handleMouseDown}
    />
  );
};
