import { CSSProperties, RefObject, useEffect, useRef, useState } from "react";
import { ZoneStoreContext } from "./../context";
import { useContextStore } from "../../../lib/use-context-store";
import { AppStoreApi, useAppStoreApi } from "../../../store";
import { useOnDragFinished } from "../../../lib/dnd/use-on-drag-finished";

const getNumItems = (appStore: AppStoreApi, zoneCompound: string) =>
  appStore.getState().state.indexes.zones[zoneCompound].contentIds.length;

export const useMinEmptyHeight = ({
  zoneCompound,
  userMinEmptyHeight,
  ref,
}: {
  zoneCompound: string;
  userMinEmptyHeight: CSSProperties["minHeight"] | number;
  ref: RefObject<HTMLDivElement | null>;
}) => {
  const appStore = useAppStoreApi();
  const [prevHeight, setPrevHeight] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { draggedItem, isZone } = useContextStore(ZoneStoreContext, (s) => {
    return {
      draggedItem:
        s.draggedItem?.data.zone === zoneCompound ? s.draggedItem : null,
      isZone: s.draggedItem?.data.zone === zoneCompound,
    };
  });

  const numItems = useRef(0);

  const onDragFinished = useOnDragFinished(
    (finished) => {
      if (finished) {
        const newNumItems = getNumItems(appStore, zoneCompound);

        setPrevHeight(0);

        if (newNumItems || numItems.current === 0) {
          setIsAnimating(false);

          return;
        }

        const selectedItem = appStore.getState().selectedItem;
        const zones = appStore.getState().state.indexes.zones;
        const nodes = appStore.getState().nodes;

        nodes.nodes[selectedItem?.props.id]?.methods.hideOverlay();

        setTimeout(() => {
          const contentIds = zones[zoneCompound]?.contentIds || [];

          contentIds.forEach((contentId) => {
            const node = nodes.nodes[contentId];
            node?.methods.sync();
          });

          if (selectedItem) {
            setTimeout(() => {
              nodes.nodes[selectedItem.props.id]?.methods.sync();
              nodes.nodes[selectedItem.props.id]?.methods.showOverlay();
            }, 200);
          }

          setIsAnimating(false);
        }, 100);
      }
    },
    [appStore, prevHeight, zoneCompound]
  );

  useEffect(() => {
    if (draggedItem && ref.current) {
      if (isZone) {
        const rect = ref.current.getBoundingClientRect();

        numItems.current = getNumItems(appStore, zoneCompound);

        setPrevHeight(rect.height);
        setIsAnimating(true);

        return onDragFinished();
      }
    }
  }, [ref.current, draggedItem, onDragFinished]);

  const returnedMinHeight = isNaN(Number(userMinEmptyHeight))
    ? userMinEmptyHeight
    : `${userMinEmptyHeight}px`;

  return [prevHeight ? `${prevHeight}px` : returnedMinHeight, isAnimating];
};
