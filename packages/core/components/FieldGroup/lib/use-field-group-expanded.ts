import { useCallback, useState } from "react";
import { useAppStore, useIsWithinPuck } from "../../../store";

export type UseFieldGroupProps = {
  /** The unique key identifying the field group to use when using within the appStore. */
  fieldGroupKey: string;
  /** Whether the field group should start expanded or not. */
  defaultExpanded?: boolean;
};

export type UseFieldGroupAPI = {
  /** Whether the field group is expanded. */
  expanded: boolean;
  /** Function to toggle the expanded state of the field group. */
  toggleExpanded: () => void;
  /** Remove the field group's entry from the appStore. Does nothing outside Puck. */
  unsetExpanded: () => void;
};

/**
 * Custom hook to manage the expanded state of a field group.
 *
 * If used within the AppStore context, it will sync the expanded state with the AppStore.
 */
const useExpandedFieldGroup = ({
  fieldGroupKey,
  defaultExpanded = false,
}: UseFieldGroupProps): UseFieldGroupAPI => {
  const dispatch = useAppStore((s) => s.dispatch);

  const isWithinPuck = useIsWithinPuck();

  const appStoreExpanded = useAppStore(
    (s) => s.state.ui.expandedFieldGroups[fieldGroupKey]
  );

  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);

  // If it's not within Puck, use the local state
  const expanded = isWithinPuck
    ? appStoreExpanded ?? defaultExpanded
    : localExpanded;

  const toggleExpanded = useCallback(() => {
    if (!isWithinPuck) {
      setLocalExpanded((prev) => !prev);
      return;
    }

    dispatch({
      type: "setUi",
      ui: (prev) => ({
        expandedFieldGroups: {
          ...prev.expandedFieldGroups,
          [fieldGroupKey]: !(
            prev.expandedFieldGroups[fieldGroupKey] ?? defaultExpanded
          ),
        },
      }),
    });
  }, [isWithinPuck, dispatch, fieldGroupKey, defaultExpanded]);

  const unsetExpanded = useCallback(() => {
    if (!isWithinPuck) return;

    dispatch({
      type: "setUi",
      ui: (prev) => {
        const expandedFieldGroups = { ...prev.expandedFieldGroups };

        delete expandedFieldGroups[fieldGroupKey];

        return { expandedFieldGroups };
      },
    });
  }, [isWithinPuck, dispatch, fieldGroupKey]);

  return {
    expanded,
    toggleExpanded,
    unsetExpanded,
  };
};

export default useExpandedFieldGroup;
