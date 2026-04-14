"use client";

import { createUsePuck } from "@puckeditor/core";
import { useMemo } from "react";
import { normalizeRootData } from "../lib/views";

const usePuck = createUsePuck();

export const useCurrentNodeEditor = () => {
  const puckRoot = usePuck((s) => s.appState.data.root);
  const dispatch = usePuck((s) => s.dispatch);
  const getItemById = usePuck((s) => s.getItemById);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const resolveDataById = usePuck((s) => s.resolveDataById);
  const selectedItem = usePuck((s) => s.selectedItem);

  const root = useMemo(() => normalizeRootData(puckRoot), [puckRoot]);
  const currentId = selectedItem?.props.id ?? "root";
  const currentProps = selectedItem?.props ?? root.props;

  const replaceProps = (
    nextProps: Record<string, any>,
    readOnly?: Record<string, boolean>
  ) => {
    if (selectedItem?.props.id) {
      const item = getItemById(selectedItem.props.id);
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
          readOnly: { ...item.readOnly, ...readOnly },
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

    resolveDataById(currentId, "replace");
  };

  return {
    currentId,
    currentProps,
    replaceProps,
    root,
  };
};
