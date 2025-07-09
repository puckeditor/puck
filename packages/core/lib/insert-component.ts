import { InsertAction } from "../reducer";
import { insertAction } from "../reducer/actions/insert";
import { AppStore } from "../store";
import { generateId } from "./generate-id";
import { getItem } from "./data/get-item";

// Makes testing easier without mocks
export const insertComponent = async (
  componentType: string,
  zone: string,
  index: number,
  appStore: AppStore
) => {
  // Reuse newData so ID retains parity between dispatch and resolver
  const id = generateId(componentType);

  const insertActionData: InsertAction = {
    type: "insert",
    componentType,
    destinationIndex: index,
    destinationZone: zone,
    id,
  };

  const { state, dispatch, resolveComponentData } = appStore;

  const insertedState = insertAction(state, insertActionData, appStore);

  // Dispatch the insert, immediately
  dispatch({
    ...insertActionData, // Dispatch insert rather set, as user's may rely on this via onAction

    // We must always record history here so the insert is added to user history
    // If the user has defined a resolveData method, they will end up with 2 history
    // entries on insert - one for the initial insert, and one when the data resolves
    recordHistory: true,
  });

  const itemSelector = {
    index,
    zone,
  };

  // Select the item, immediately
  dispatch({ type: "setUi", ui: { itemSelector } });

  const itemData = getItem(itemSelector, insertedState);

  if (itemData) {
    // Run any resolvers, async
    const resolved = await resolveComponentData(itemData, "insert");

    if (resolved.didChange) {
      dispatch({
        type: "replace",
        destinationZone: itemSelector.zone,
        destinationIndex: itemSelector.index,
        data: resolved.node,
      });
    }
  }
};
