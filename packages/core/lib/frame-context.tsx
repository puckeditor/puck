"use client";

import React, {
  createContext,
  useContext,
  useRef,
  RefObject,
  useMemo,
} from "react";

interface FrameContextType {
  frameRef: RefObject<HTMLDivElement | null>;
}

const FrameContext = createContext<FrameContextType | null>(null);

// Provider component
export const FrameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);

  const value = useMemo(
    () => ({
      frameRef,
    }),
    []
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
