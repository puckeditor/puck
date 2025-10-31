import { AppStore } from "../../store";
import { PuckNodeData } from "../../types/Internal";
import { getSelectorForId } from "../get-selector-for-id";
import { toComponent } from "./to-component";

export async function resolveComponentDataById<
  PickedStore extends Pick<
    AppStore,
    "resolveComponentData" | "state" | "dispatch"
  >
>(id: string, store: PickedStore) {
  const notFoundMsg = `Warning: Could not find component with id "${id}" to resolve its data. Component may have been removed or the id is invalid.`;
  const node: PuckNodeData | undefined = store.state.indexes.nodes[id];
  if (!node) {
    console.warn(notFoundMsg);
    return;
  }

  const resolvedResult = await store.resolveComponentData(node.data, "force");
  if (!resolvedResult.didChange) return;

  const itemSelector = getSelectorForId(
    store.state,
    resolvedResult.node.props.id
  );
  if (!itemSelector) {
    console.warn(notFoundMsg);
    return;
  }

  store.dispatch({
    type: "replace",
    data: toComponent(resolvedResult.node),
    destinationIndex: itemSelector.index,
    destinationZone: itemSelector.zone,
  });
}
