"use client";

import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../../store";
import { SlotRenderPure } from "./server";
export * from "./server";

export const ContextSlotRender = ({
  componentId,
  zone,
}: {
  componentId: string;
  zone: string;
}) => {
  const config = useAppStore((s) => s.config);
  const metadata = useAppStore((s) => s.metadata);
  const slotContent = useAppStore(
    useShallow((s) => {
      const indexes = s.state.indexes;

      const contentIds =
        indexes.zones[`${componentId}:${zone}`]?.contentIds ?? [];

      return contentIds.map((contentId) => indexes.nodes[contentId].flatData);
    })
  );

  return (
    <SlotRenderPure
      content={slotContent}
      zone={zone}
      config={config}
      metadata={metadata}
    />
  );
};
