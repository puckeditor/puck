import { useAppStoreApi } from "../../store";
import { ComponentData, ResolveDataTrigger, UiState } from "../../types";

import { getSelectorForId } from "../get-selector-for-id";

import { toComponent } from "./to-component";

/**
 * Resolves the data of a component and replaces it in the appStore state.
 * @param currentData - The current data of the component to resolve.
 * @param getState - The function to get the current state of the appStore.
 * @param trigger - The trigger for resolving the data. Defaults to "force".
 * @param writeThrough - Whether to write through the resolved data even if it hasn't changed. Defaults to false.
 * @param ui - Optional UI state to set after replacing the component.
 * @returns A promise that resolves when the data has been replaced.
 */
export async function resolveAndReplaceData(
  currentData: ComponentData,
  getState: ReturnType<typeof useAppStoreApi>["getState"],
  trigger: ResolveDataTrigger = "force",
  writeThrough: boolean = false,
  ui?: Partial<UiState>
) {
  const resolvedResult = await getState().resolveComponentData(
    currentData,
    trigger
  );
  if (!resolvedResult.didChange && !writeThrough) return;

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
    ui,
  });
}
