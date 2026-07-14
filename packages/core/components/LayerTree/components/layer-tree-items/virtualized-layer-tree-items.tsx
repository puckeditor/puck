import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef } from "react";

import getClassNameFactory from "../../../../lib/get-class-name-factory";

import { useOutlineDndStore } from "../../lib/store";
import { LayerZone } from "../../types";

import { EmptyZonePlaceholder } from "../empty-zone-placeholder";
import { Layer } from "../layer";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("LayerTree", styles);

const DEFAULT_LAYER_ROW_HEIGHT = 32;
const LAYER_TREE_VIRTUALIZATION_OVERSCAN = 8;

const measuredRowHeights = new Map<string, number>();

const getEstimatedRowHeight = (itemId: string) =>
  measuredRowHeights.get(itemId) ?? DEFAULT_LAYER_ROW_HEIGHT;

const cacheMeasuredRowHeight = (itemId: string, height: number) => {
  if (height <= 0) {
    return;
  }

  measuredRowHeights.set(itemId, height);
};

const getFirstScrollAncestor = (el: HTMLElement | null) => {
  let current = el?.parentElement ?? null;

  while (current) {
    const { overflow, overflowY } = getComputedStyle(current);

    if ([overflow, overflowY].some((value) => /auto|scroll/.test(value))) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

/**
 * Renders only the outline's items in view for large root-level zones.
 */
export const VirtualizedLayerTreeItems = ({
  depth,
  selectedId,
  tree,
}: {
  depth: number;
  selectedId: string | null;
  tree: LayerZone;
}) => {
  const listRef = useRef<HTMLUListElement | null>(null);

  // Pin the dragged row so autoscroll can't unmount the drag source
  // mid-drag, which would kill the drag operation
  const pinnedIndex = useOutlineDndStore((s) =>
    s.draggedRow?.zoneCompound === tree.zoneCompound ? s.draggedRow.index : null
  );

  const rangeExtractor = useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) => {
      const indexes = defaultRangeExtractor(range);

      if (pinnedIndex !== null && !indexes.includes(pinnedIndex)) {
        indexes.push(pinnedIndex);
        indexes.sort((a, b) => a - b);
      }

      return indexes;
    },
    [pinnedIndex]
  );

  const virtualizer = useVirtualizer({
    count: tree.items.length,
    estimateSize: (index) => getEstimatedRowHeight(tree.items[index].itemId),
    getItemKey: (index) => tree.items[index].itemId,
    getScrollElement: () => getFirstScrollAncestor(listRef.current),
    overscan: LAYER_TREE_VIRTUALIZATION_OVERSCAN,
    rangeExtractor,
    measureElement: (element: HTMLElement) => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      const itemId = element.dataset.puckLayerTreeId;

      if (itemId) {
        cacheMeasuredRowHeight(itemId, height);
      }

      return height || DEFAULT_LAYER_ROW_HEIGHT;
    },
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const renderedItems = [];
  let previousEnd = 0;
  let previousIndex = -1;

  virtualItems.forEach((virtualItem) => {
    const node = tree.items[virtualItem.index];
    const gapSize = Math.max(virtualItem.start - previousEnd, 0);

    if (gapSize > 0) {
      renderedItems.push(
        <li
          key={`gap:${tree.zoneCompound}:${previousIndex}:${virtualItem.index}`}
          aria-hidden="true"
          style={{ height: `${gapSize}px` }}
        />
      );
    }

    renderedItems.push(
      <Layer
        dataIndex={virtualItem.index}
        depth={depth}
        isSelected={selectedId === node.itemId}
        key={node.itemId}
        node={node}
        ref={virtualizer.measureElement}
        selectedId={selectedId}
      />
    );

    previousEnd = virtualItem.end;
    previousIndex = virtualItem.index;
  });

  const trailingGap = Math.max(totalSize - previousEnd, 0);

  if (trailingGap > 0) {
    renderedItems.push(
      <li
        key={`gap:${tree.zoneCompound}:${previousIndex}:end`}
        aria-hidden="true"
        style={{ height: `${trailingGap}px` }}
      />
    );
  }

  return (
    <ul className={getClassName({ nested: depth > 0 })} ref={listRef}>
      {tree.items.length === 0 && (
        <EmptyZonePlaceholder zoneCompound={tree.zoneCompound} />
      )}
      {renderedItems}
    </ul>
  );
};
