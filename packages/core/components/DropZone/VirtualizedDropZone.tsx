import {
  ReactNode,
  Ref,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAppStore, useAppStoreApi } from "../../store";
import {
  defaultRangeExtractor,
  elementScroll,
  observeElementOffset,
  observeElementRect,
  observeWindowOffset,
  observeWindowRect,
  useVirtualizer,
  windowScroll,
} from "@tanstack/react-virtual";
import { ZoneStoreContext } from "./context";
import { useContextStore } from "../../lib/use-context-store";
import { getFrame } from "../../lib/get-frame";

const ROOT_ZONE_VIRTUALIZATION_OVERSCAN = 5;
const DEFAULT_VIRTUALIZED_ITEM_HEIGHT = 320; // TODO add API to configure this on per component basis
const measuredItemHeights = new Map<string, number>();

const getEstimatedItemHeight = (componentId: string) =>
  measuredItemHeights.get(componentId) ?? DEFAULT_VIRTUALIZED_ITEM_HEIGHT;

const cacheMeasuredItemHeight = (componentId: string, height: number) => {
  if (height <= 0) {
    return;
  }

  measuredItemHeights.set(componentId, height);
};

type VirtualizedDropZoneProps = {
  contentIds: string[];
  zoneCompound: string;
  renderItem: (props: {
    componentId: string;
    index: number;
    measureRef: Ref<HTMLElement>;
  }) => ReactNode;
};

export const VirtualizedDropZone = ({
  contentIds,
  zoneCompound,
  renderItem,
}: VirtualizedDropZoneProps) => {
  const selectedId = useAppStore((s) => s.selectedItem?.props.id ?? null);

  const frame = getFrame();
  const zoneStore = useContext(ZoneStoreContext);
  const draggedItemId = useContextStore(ZoneStoreContext, (s) => {
    const draggedId = s.draggedItem?.id;

    return draggedId ? String(draggedId) : null;
  });

  const dragTargetParentId = useContextStore(ZoneStoreContext, (s) => {
    if (s.draggedItem?.id) {
      const parentZone = Object.keys(s.previewIndex ?? {})[0];
      return parentZone?.split(":")[0];
    }

    return null;
  });

  const iframeWindow = frame?.defaultView;
  const measureRefsRef = useRef(new Map<string, Ref<HTMLElement>>());

  const appStoreApi = useAppStoreApi();
  const resolveIndex = useCallback(
    (targetId: string | null) => {
      if (!targetId || targetId === "root") {
        return -1;
      }

      const directIndex = contentIds.indexOf(targetId);

      if (directIndex > -1) {
        return directIndex;
      }

      const path =
        appStoreApi.getState().state.indexes.nodes?.[targetId]?.path ?? [];

      for (let i = path.length - 1; i >= 0; i -= 1) {
        const candidateId = path[i]?.split(":")[0];

        if (!candidateId || candidateId === "root") {
          continue;
        }

        const index = contentIds.indexOf(candidateId);

        if (index > -1) {
          return index;
        }
      }

      return -1;
    },
    [appStoreApi, contentIds]
  );

  const pinnedIndexes = useMemo(() => {
    const nextPinnedIndexes = new Set<number>();

    // Known bug: when fast scrolling into root across virtualization items
    // the targetId might not update in time and the dragged item may disappear
    // the user can move the cursor around to get the item to appear
    [selectedId, draggedItemId, dragTargetParentId].forEach((targetId) => {
      const currentIndex = resolveIndex(targetId);

      if (currentIndex > -1) {
        nextPinnedIndexes.add(currentIndex);
      }
    });

    return Array.from(nextPinnedIndexes).sort((a, b) => a - b);
  }, [dragTargetParentId, draggedItemId, resolveIndex, selectedId]);

  const rangeExtractor = useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) => {
      const indexes = defaultRangeExtractor(range);

      pinnedIndexes.forEach((index) => {
        if (!indexes.includes(index)) {
          indexes.push(index);
        }
      });

      indexes.sort((a, b) => a - b);

      return indexes;
    },
    [pinnedIndexes]
  );

  const virtualizer = useVirtualizer<any, HTMLElement>({
    count: contentIds.length,
    getItemKey: (index) => contentIds[index],
    estimateSize: (index) => getEstimatedItemHeight(contentIds[index]),
    getScrollElement: () => iframeWindow ?? null,
    overscan: ROOT_ZONE_VIRTUALIZATION_OVERSCAN,
    observeElementRect: (instance, cb) =>
      iframeWindow
        ? observeWindowRect(instance as any, cb)
        : observeElementRect(instance as any, cb),
    observeElementOffset: (instance, cb) =>
      iframeWindow
        ? observeWindowOffset(instance as any, cb)
        : observeElementOffset(instance as any, cb),
    scrollToFn: (offset, options, instance) =>
      iframeWindow
        ? windowScroll(offset, options, instance as any)
        : elementScroll(offset, options, instance as any),
    rangeExtractor,
    initialOffset: () => (iframeWindow ? iframeWindow.scrollY : 0),
  });

  useEffect(() => {
    zoneStore.getState().registerRootVirtualizer(zoneCompound, {
      resolveIndex: (targetId) => resolveIndex(targetId),
      virtualizer,
    });

    return () => {
      zoneStore.getState().unregisterRootVirtualizer(zoneCompound);
    };
  }, [resolveIndex, virtualizer, zoneCompound, zoneStore]);

  const getMeasureRef = useCallback((componentId: string): Ref<HTMLElement> => {
    const cachedRef = measureRefsRef.current.get(componentId);

    if (cachedRef) {
      return cachedRef;
    }

    const measureRef = (element: HTMLElement | null) => {
      if (!element) {
        return;
      }

      const height =
        Math.ceil(element.getBoundingClientRect().height) ||
        DEFAULT_VIRTUALIZED_ITEM_HEIGHT;

      if (typeof height === "number" && height > 0) {
        cacheMeasuredItemHeight(componentId, height);
      }
    };

    measureRefsRef.current.set(componentId, measureRef);

    return measureRef;
  }, []);

  useEffect(() => {
    const validIds = new Set(contentIds);

    Array.from(measureRefsRef.current.keys()).forEach((componentId) => {
      if (!validIds.has(componentId)) {
        measureRefsRef.current.delete(componentId);
      }
    });
  }, [contentIds]);

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const renderedItems = useMemo(() => {
    const items: ReactNode[] = [];

    let previousEnd = 0;
    let previousIndex = -1;

    virtualItems.forEach((virtualItem) => {
      if (!virtualItem) return;

      const componentId = contentIds[virtualItem.index];
      const gapSize = Math.max(virtualItem.start - previousEnd, 0);

      if (gapSize > 0) {
        items.push(
          <div
            key={`gap:${previousIndex}:${virtualItem.index}`}
            style={{ height: `${gapSize}px` }}
          />
        );
      }

      items.push(
        renderItem({
          componentId,
          index: virtualItem.index,
          measureRef: getMeasureRef(componentId),
        })
      );

      previousEnd = virtualItem.end;
      previousIndex = virtualItem.index;
    });

    const trailingGap = Math.max(totalSize - previousEnd, 0);

    if (trailingGap > 0) {
      items.push(
        <div
          key={`gap:${previousIndex}:end`}
          style={{ height: `${trailingGap}px` }}
        />
      );
    }

    return items;
  }, [totalSize, virtualItems, getMeasureRef]);

  return <>{renderedItems}</>;
};
