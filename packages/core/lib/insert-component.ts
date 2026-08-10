import { InsertAction } from "../reducer";
import { insertAction } from "../reducer/actions/insert";
import { useAppStoreApi } from "../store";

import { generateId } from "./generate-id";
import { getItem } from "./data/get-item";
import { resolveAndReplaceData } from "./data/resolve-and-replace-data";

/**
 * Inserts a new component of the specified type into the specified zone at the specified index, and resolves its data.
 *
 * @param componentType - The type of the component to insert.
 * @param zone - The zone in which to insert the component.
 * @param index - The index at which to insert the component within the zone.
 * @param appStore - The app store API to use for dispatching actions and getting state.
 * @returns A promise that resolves when the component has been inserted and its data has been resolved.
 */
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

  await resolveAndReplaceData(itemData, getState, "insert");
};
