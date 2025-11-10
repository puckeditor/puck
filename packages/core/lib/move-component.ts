import { useAppStoreApi } from "../store";
import { ItemSelector } from "./data/get-item";
import { getSelectorForId } from "./get-selector-for-id";
import { rootDroppableId } from "./root-droppable-id";

/**
 * Moves a component, resolves its data, and updates the appStore state.
 * @param id - Id of the component to move.
 * @param sourceSelector - The current position of the component.
 * @param destinationSelector - The target position to move the component to.
 * @param appStore - The appStore instance where the component is.
 * @returns A promise that resolves when the move operation is complete.
 */
export const moveComponent = async (
  id: string,
  sourceSelector: ItemSelector,
  destinationSelector: ItemSelector,
  appStore: ReturnType<typeof useAppStoreApi>
) => {
  const dispatch = appStore.getState().dispatch;
  dispatch({
    type: "move",
    sourceIndex: sourceSelector.index,
    sourceZone: sourceSelector.zone ?? rootDroppableId,
    destinationIndex: destinationSelector.index,
    destinationZone: destinationSelector.zone ?? rootDroppableId,
    recordHistory: false,
  });

  const componentData = appStore.getState().state.indexes.nodes[id]?.data;
  if (!componentData) return;

  const resolveComponentData = appStore.getState().resolveComponentData;
  const resolvedData = await resolveComponentData(componentData, "move");

  // Use latest position, in case it has moved
  const latestItemSelector = getSelectorForId(
    appStore.getState().state,
    componentData.props.id
  );
  if (!latestItemSelector) return;

  if (resolvedData.didChange)
    dispatch({
      type: "replace",
      data: resolvedData.node,
      destinationIndex: latestItemSelector.index,
      destinationZone: latestItemSelector.zone ?? rootDroppableId,
    });
};
