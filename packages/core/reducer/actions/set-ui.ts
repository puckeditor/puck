import { Data, UiState } from "../../types";
import { SetUiAction } from "../actions";
import { PrivateAppState } from "../../types/Internal";
import { getItem } from "../../lib/data/get-item";
import { rootAreaId } from "../../lib/root-droppable-id";

/**
 * Expands the outline ancestors of a newly selected item so its row is
 * visible in the outline.
 *
 * NB: This will always run and add expansions, even if the outline plugin is not used.
 * Another option could be to export this and use it explicitly where needed.
 * If done explicitly anywhere needed though, it will also run into this problem (entries are added automatically).
 */
const revealSelectedItem = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  partialUi: Partial<UiState>
): Partial<UiState> => {
  const itemSelector = partialUi.itemSelector;

  if (!itemSelector) {
    return partialUi;
  }

  const item = getItem(itemSelector, state);

  if (!item) {
    return partialUi;
  }

  const path = state.indexes.nodes[item.props.id]?.path ?? [];
  const collapsedAncestorIds = path
    .map((zoneCompound) => zoneCompound.split(":")[0])
    .filter(
      (ancestorId) =>
        ancestorId &&
        ancestorId !== rootAreaId &&
        !state.ui.itemExpanded?.[ancestorId] &&
        !partialUi.itemExpanded?.[ancestorId]
    );

  if (collapsedAncestorIds.length === 0) {
    return partialUi;
  }

  const itemExpanded = {
    ...state.ui.itemExpanded,
    ...partialUi.itemExpanded,
  };

  collapsedAncestorIds.forEach((ancestorId) => {
    itemExpanded[ancestorId] = true;
  });

  return { ...partialUi, itemExpanded };
};

export const setUiAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: SetUiAction
): PrivateAppState<UserData> => {
  const partialUi =
    typeof action.ui === "object" ? action.ui : action.ui(state.ui);

  return {
    ...state,
    ui: {
      ...state.ui,
      ...revealSelectedItem(state, partialUi),
    },
  };
};
