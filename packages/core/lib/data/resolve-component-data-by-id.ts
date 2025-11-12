import { useAppStoreApi } from "../../store";
import { ResolveDataTrigger } from "../../types";
import { PuckNodeData } from "../../types/Internal";
import { getSelectorForId } from "../get-selector-for-id";
import { toComponent } from "./to-component";

export async function resolveComponentDataById(
  id: string,
  getState: ReturnType<typeof useAppStoreApi>["getState"],
  trigger: ResolveDataTrigger = "force"
) {
  const node: PuckNodeData | undefined = getState().state.indexes.nodes[id];

  const notFoundMsg = `Warning: Could not find component with id "${id}" to resolve its data. Component may have been removed or the id is invalid.`;
  if (!node) {
    console.warn(notFoundMsg);
    return;
  }

  const resolvedResult = await getState().resolveComponentData(
    node.data,
    trigger
  );
  if (!resolvedResult.didChange) return;

  const itemSelector = getSelectorForId(
    getState().state,
    resolvedResult.node.props.id
  );
  if (!itemSelector) {
    console.warn(notFoundMsg);
    return;
  }

  getState().dispatch({
    type: "replace",
    data: toComponent(resolvedResult.node),
    destinationIndex: itemSelector.index,
    destinationZone: itemSelector.zone,
  });
}
