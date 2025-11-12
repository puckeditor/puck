import { useAppStoreApi } from "../../store";
import { ResolveDataTrigger } from "../../types";
import { getItem, ItemSelector } from "./get-item";
import { toComponent } from "./to-component";
import { resolveDataById } from "./resolve-data-by-id";

export async function resolveDataBySelector(
  selector: ItemSelector,
  getState: ReturnType<typeof useAppStoreApi>["getState"],
  trigger: ResolveDataTrigger = "force"
) {
  const item = getItem(selector, getState().state);

  const notFoundMsg = `Warning: Could not find component with selector "${JSON.stringify(
    selector
  )}" to resolve its data. Component may have been removed or the selector is invalid.`;
  if (!item) {
    console.warn(notFoundMsg);
    return;
  }

  const itemAsComponent = toComponent(item);

  await resolveDataById(itemAsComponent.props.id, getState, trigger);
}
