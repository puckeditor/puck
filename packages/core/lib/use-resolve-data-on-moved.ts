import { useEffect } from "react";
import { useAppStoreApi } from "../store";
import { getSelectorForId } from "./get-selector-for-id";
import { rootDroppableId } from "./root-droppable-id";
import { getItem } from "./data/get-item";

export const useResolveDataOnMoved = (
  appStore: ReturnType<typeof useAppStoreApi>
) => {
  useEffect(() => {
    return appStore.subscribe(
      (s) => s.state.ui.isDragging,
      async (currIsDragging, prevIsDragging) => {
        const dragFinished = prevIsDragging && !currIsDragging;
        if (!dragFinished) return;

        const itemSelector = appStore.getState().state.ui.itemSelector;
        if (!itemSelector) return;

        const item = getItem(itemSelector, appStore.getState().state);
        if (!item) return;

        const resolveComponentData = appStore.getState().resolveComponentData;
        const dispatch = appStore.getState().dispatch;

        const resolvedData = await resolveComponentData(item, "move");

        // The item could've moved since starting resolution
        const latestItemSelector = getSelectorForId(
          appStore.getState().state,
          item.props.id
        );
        if (!latestItemSelector) return;

        if (resolvedData.didChange)
          dispatch({
            type: "replace",
            data: resolvedData.node,
            destinationIndex: latestItemSelector.index,
            destinationZone: latestItemSelector.zone ?? rootDroppableId,
          });
      }
    );
  }, []);
};
