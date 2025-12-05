import { useAppStoreApi } from "../../store";
import { ComponentData, ResolveDataTrigger } from "../../types";
import { getSelectorForId } from "../get-selector-for-id";
import { toComponent } from "./to-component";

export async function resolveAndReplaceData(
  currentData: ComponentData,
  getState: ReturnType<typeof useAppStoreApi>["getState"],
  trigger: ResolveDataTrigger = "force"
) {
  const resolvedResult = await getState().resolveComponentData(
    currentData,
    trigger
  );
  if (!resolvedResult.didChange) return;

  const itemSelector = getSelectorForId(
    getState().state,
    resolvedResult.node.props.id
  );
  if (!itemSelector) {
    console.warn(
      `Warning: Could not find component with id "${currentData.props.id}" to resolve its data. Component may have been removed or the id is invalid.`
    );
    return;
  }

  getState().dispatch({
    type: "replace",
    data: toComponent(resolvedResult.node),
    destinationIndex: itemSelector.index,
    destinationZone: itemSelector.zone,
  });
}
