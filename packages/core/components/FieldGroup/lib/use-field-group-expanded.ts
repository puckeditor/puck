import { useCallback, useState } from "react";
import { useAppStore, useIsWithinPuck } from "../../../store";

export type UseFieldGroupProps = {
  /** The unique key identifying the field group to use when using within the appStore. */
  fieldGroupKey: string;
};

export type UseFieldGroupAPI = {
  /** Whether the field group is expanded. */
  expanded: boolean;
  /** Function to toggle the expanded state of the field group. */
  toggleExpanded: () => void;
  /** Unset the expanded state of the field group. Removing it from app store if within Puck. */
  unsetExpanded: () => void;
};

/**
 * Custom hook to manage the expanded state of a field group.
 *
 * If used within the AppStore context, it will sync the expanded state with the AppStore.
 */
const useFieldGroupExpanded = ({
  fieldGroupKey,
}: UseFieldGroupProps): UseFieldGroupAPI => {
  const dispatch = useAppStore((s) => s.dispatch);

  const isWithinPuck = useIsWithinPuck();

  const appStoreExpanded = useAppStore(
    (s) => s.state.ui.fieldGroupExpanded[fieldGroupKey]
  );

  const setAppStoreExpanded = useCallback(
    ({ expanded }: { expanded: boolean }) => {
      dispatch({
        type: "setUi",
        ui: (prev) => {
          const newUi = {
            fieldGroupExpanded: {
              ...prev.fieldGroupExpanded,
            },
          };

          if (!expanded) {
            delete newUi.fieldGroupExpanded[fieldGroupKey];
          } else {
            newUi.fieldGroupExpanded[fieldGroupKey] = true;
          }

          return newUi;
        },
      });
    },
    [dispatch, fieldGroupKey]
  );

  const toggleAppStoreExpanded = useCallback(
    () => setAppStoreExpanded({ expanded: !appStoreExpanded }),
    [setAppStoreExpanded, appStoreExpanded]
  );

  const [localExpanded, setLocalExpanded] = useState(false);

  // If it's not within Puck, use the local state
  const expanded = isWithinPuck ? appStoreExpanded : localExpanded;

  const toggleExpanded = useCallback(() => {
    if (isWithinPuck) {
      toggleAppStoreExpanded();
      return;
    }

    setLocalExpanded((prev) => !prev);
  }, [isWithinPuck, toggleAppStoreExpanded]);

  const unsetExpanded = useCallback(() => {
    if (isWithinPuck) {
      setAppStoreExpanded({ expanded: false });
      return;
    }

    setLocalExpanded(false);
  }, [isWithinPuck, setAppStoreExpanded]);

  return {
    expanded,
    toggleExpanded,
    unsetExpanded,
  };
};

export default useFieldGroupExpanded;
