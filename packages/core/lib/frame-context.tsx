"use client";

import React, {
  createContext,
  useContext,
  useRef,
  RefObject,
  useMemo,
  useCallback,
} from "react";
import { useResetAutoZoom } from "./use-reset-auto-zoom";

interface FrameContextType {
  frameRef: RefObject<HTMLDivElement | null>;
  resetAutoZoom: ReturnType<typeof useResetAutoZoom>;
}

const FrameContext = createContext<FrameContextType | null>(null);

// Provider component
export const FrameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);

  const resetAutoZoomFn = useResetAutoZoom(frameRef);

  const resetAutoZoom = useCallback((newViewports?: any) => {
    resetAutoZoomFn(newViewports);
  }, []);

  const value = useMemo(
    () => ({
      frameRef,
      resetAutoZoom,
    }),
    [resetAutoZoom]
  );

  return (
    <FrameContext.Provider value={value}>{children}</FrameContext.Provider>
  );
};

export const useCanvasFrame = (): FrameContextType => {
  const context = useContext(FrameContext);

  if (context === null) {
    throw new Error("useCanvasFrame must be used within a FrameProvider");
  }

  return context;
};
