import { useAppStoreApi } from "../../store";
import { ResolveDataTrigger } from "../../types";
import { getItem, ItemSelector } from "./get-item";
import { toComponent } from "./to-component";
import { resolveAndReplaceData } from "./resolve-and-replace-data";

export async function resolveDataBySelector(
  selector: ItemSelector,
  getState: ReturnType<typeof useAppStoreApi>["getState"],
  trigger: ResolveDataTrigger = "force"
) {
  const item = getItem(selector, getState().state);

  if (!item) {
    console.warn(
      `Warning: Could not find component for selector "${JSON.stringify(
        selector
      )}" to resolve its data. Component may have been removed or the selector is invalid.`
    );
    return;
  }

  const itemAsComponent = toComponent(item);

  await resolveAndReplaceData(itemAsComponent, getState, trigger);
}
