import { InsertAction } from "../reducer";
import { insertAction } from "../reducer/actions/insert";
import { useAppStoreApi } from "../store";
import { generateId } from "./generate-id";
import { getItem } from "./data/get-item";
import { getSelectorForId } from "./get-selector-for-id";

// Makes testing easier without mocks
export const insertComponent = async (
  componentType: string,
  zone: string,
  index: number,
  appStore: ReturnType<typeof useAppStoreApi>
) => {
  const { getState } = appStore;

  // Reuse newData so ID retains parity between dispatch and resolver
  const id = generateId(componentType);

  const insertActionData: InsertAction = {
    type: "insert",
    componentType,
    destinationIndex: index,
    destinationZone: zone,
    id,
  };

  const stateBefore = getState().state;
  const insertedState = insertAction(stateBefore, insertActionData, getState());

  // Dispatch the insert, immediately
  const dispatch = getState().dispatch;
  dispatch({
    ...insertActionData, // Dispatch insert rather set, as user's may rely on this via onAction

    // We must always record history here so the insert is added to user history
    // If the user has defined a resolveData method, they will end up with 2 history
    // entries on insert - one for the initial insert, and one when the data resolves
    recordHistory: true,
  });

  const itemSelector = { index, zone };

  // Select the item, immediately
  dispatch({ type: "setUi", ui: { itemSelector } });

  const itemData = getItem(itemSelector, insertedState);
  if (!itemData) return;

  // Run any resolvers
  const resolveComponentData = getState().resolveComponentData;
  const resolved = await resolveComponentData(itemData, "insert");
  if (!resolved.didChange) return;

  // Use latest position, in case it has moved
  const latestItemSelector = getSelectorForId(getState().state, id);
  if (!latestItemSelector) return;

  dispatch({
    type: "replace",
    destinationZone: latestItemSelector.zone,
    destinationIndex: latestItemSelector.index,
    data: resolved.node,
  });
};
