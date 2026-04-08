"use client";

import { createUsePuck } from "@puckeditor/core";
import type { ComponentData, RootData } from "@puckeditor/core";
import { useMemo } from "react";
import { normalizeRootData } from "../lib/views";

const usePuck = createUsePuck();

export const useCurrentNodeEditor = () => {
  const appState = usePuck((s) => s.appState);
  const dispatch = usePuck((s) => s.dispatch);
  const getItemById = usePuck((s) => s.getItemById);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const resolveDataById = usePuck((s) => s.resolveDataById);
  const selectedItem = usePuck((s) => s.selectedItem);

  const root = useMemo(
    () => normalizeRootData(appState.data.root as RootData),
    [appState.data.root]
  );
  const currentId = selectedItem?.props.id ?? "root";
  const currentProps = selectedItem?.props ?? root.props;

  const replaceProps = async (nextProps: Record<string, any>) => {
    if (selectedItem?.props.id) {
      const item = getItemById(selectedItem.props.id) as ComponentData | undefined;
      const selector = getSelectorForId(selectedItem.props.id);

      if (!item || !selector) {
        return;
      }

      dispatch({
        type: "replace",
        destinationIndex: selector.index,
        destinationZone: selector.zone,
        data: {
          ...item,
          props: {
            ...nextProps,
            id: nextProps.id ?? item.props.id,
          },
        },
      });
    } else {
      dispatch({
        type: "replaceRoot",
        root: {
          ...root,
          props: nextProps,
        },
        recordHistory: true,
      });
    }

    await Promise.resolve(resolveDataById(currentId, "replace"));
  };

  return {
    currentId,
    currentProps,
    replaceProps,
    root,
  };
};
