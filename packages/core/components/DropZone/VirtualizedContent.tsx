import { memo, RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DragAxis } from "../../types";

const ESTIMATED_ITEM_HEIGHT = 100;
const OVERSCAN_COUNT = 5;

interface VirtualizedContentProps {
  contentIds: string[];
  zoneCompound: string;
  dragAxis: DragAxis;
  collisionAxis?: DragAxis;
  inDroppableZone: boolean;
  parentRef: RefObject<HTMLElement | null>;
  renderItem: (componentId: string, index: number) => React.ReactNode;
}

/**
 * Virtualized content renderer for DropZone.
 * Only renders visible items plus a configurable overscan buffer.
 * Enables handling 5,000+ components without performance degradation.
 */
export const VirtualizedContent = memo(function VirtualizedContent({
  contentIds,
  dragAxis,
  parentRef,
  renderItem,
}: VirtualizedContentProps) {
  const isHorizontal = dragAxis === "x";

  const virtualizer = useVirtualizer({
    count: contentIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: OVERSCAN_COUNT,
    horizontal: isHorizontal,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // If no items to virtualize, return empty container
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        height: isHorizontal ? "100%" : totalSize,
        width: isHorizontal ? totalSize : "100%",
        position: "relative",
      }}
    >
      {items.map((virtualItem) => {
        const componentId = contentIds[virtualItem.index];

        return (
          <div
            key={componentId}
            data-index={virtualItem.index}
            data-virtualized="true"
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: isHorizontal ? undefined : "100%",
              height: isHorizontal ? "100%" : undefined,
              transform: isHorizontal
                ? `translateX(${virtualItem.start}px)`
                : `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(componentId, virtualItem.index)}
          </div>
        );
      })}
    </div>
  );
});

/**
 * Configuration for virtualization behavior.
 */
export const VIRTUALIZATION_CONFIG = {
  /**
   * Minimum number of items before virtualization is enabled.
   * Below this threshold, standard rendering is used.
   */
  threshold: 50,

  /**
   * Number of items to render outside the visible area.
   * Higher values = smoother scrolling but more DOM nodes.
   */
  overscan: OVERSCAN_COUNT,

  /**
   * Default estimated height for items before measurement.
   */
  estimatedItemSize: ESTIMATED_ITEM_HEIGHT,
};
