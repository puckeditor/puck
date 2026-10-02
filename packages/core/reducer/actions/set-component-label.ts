import { Data } from "../../types";
import { SetComponentLabelAction } from "../actions";
import { PrivateAppState } from "../../types/Internal";
import { walkAppState } from "../../lib/data/walk-app-state";
import { AppStore } from "../../store";

export const setComponentLabelAction = <UserData extends Data>(
  state: PrivateAppState<UserData>,
  action: SetComponentLabelAction,
  appStore: AppStore
): PrivateAppState<UserData> => {
  return walkAppState(state, appStore.config, undefined, (item) => {
    if (item.props.id !== action.id) return item;

    const type = item.type.toString();
    const defaultLabel = appStore.config.components[type]?.label ?? type;
    const newLabel = action.label?.trim() || undefined;

    // If the new label matches the default, remove the custom override
    if (!newLabel || newLabel === defaultLabel) {
      // Remove __puck.label
      const { label: _removed, ...restPuck } = item.__puck ?? {};
      const hasAnyPuckProp = Object.keys(restPuck).length > 0;

      if (hasAnyPuckProp) {
        // Keep __puck but without the label property
        return { ...item, __puck: restPuck };
      }

      // __puck is empty — remove it entirely
      const { __puck: _removedPuck, ...itemWithoutPuck } = item;
      return itemWithoutPuck;
    }

    // Custom label differs from default — store it
    return {
      ...item,
      __puck: {
        ...item.__puck,
        label: newLabel,
      },
    };
  });
};
