"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import styles from "./style.module.css";

const getClassName = getClassNameFactory("Modal", styles);

export function Modal({
  children,
  onClose,
  isOpen,
}: {
  children: ReactNode;
  onClose: () => void;
  isOpen: boolean;
}) {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRootEl(document.getElementById("puck-portal-root") ?? document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!rootEl || !isOpen) {
    return null;
  }

  return createPortal(
    <div className={getClassName()} onClick={onClose}>
      <div
        className={getClassName("frame")}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    rootEl
  );
}
