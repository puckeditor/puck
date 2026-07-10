import { Copy, Trash } from "lucide-react";
import { SyntheticEvent, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import getClassNameFactory from "../../../lib/get-class-name-factory";
import { getItem } from "../../../lib/data/get-item";
import { useAppStore } from "../../../store";
import { IconButton } from "../../IconButton";

import { useOutlineDndStoreApi } from "../lib/store";
import styles from "../styles.module.css";
import { LayerNode } from "../types";

const getClassName = getClassNameFactory("LayerActions", styles);

/**
 * Renders the actions to manage a layer node.
 */
export const LayerActions = ({
  node,
  visible,
}: {
  node: LayerNode;
  visible: boolean;
}) => {
  const dispatch = useAppStore((s) => s.dispatch);
  const outlineStore = useOutlineDndStoreApi();

  const permissions = useAppStore(
    useShallow((s) => {
      const item = getItem(
        { index: node.index, zone: node.zoneCompound },
        s.state
      );
      const itemPermissions = s.permissions.getPermissions({ item });

      return {
        delete: itemPermissions.delete,
        duplicate: itemPermissions.duplicate,
      };
    })
  );

  const deleteItem = useCallback(
    (e: SyntheticEvent<Element>) => {
      // Don't select the component
      e.stopPropagation();

      if (outlineStore.getState().status !== "idle") {
        return;
      }

      dispatch({
        type: "remove",
        index: node.index,
        zone: node.zoneCompound,
      });

      dispatch({
        type: "setUi",
        ui: (prev) => {
          const newItemExpanded = { ...prev.itemExpanded };

          node.childZones.forEach((childZone) => {
            childZone.items.forEach((childNode) => {
              delete newItemExpanded[childNode.itemId];
            });
          });

          delete newItemExpanded[node.itemId];

          return {
            ...prev,
            itemExpanded: newItemExpanded,
          };
        },
      });
    },
    [dispatch, outlineStore, node]
  );

  const duplicateItem = useCallback(
    (e: SyntheticEvent<Element>) => {
      // Don't select the component
      e.stopPropagation();

      if (outlineStore.getState().status !== "idle") {
        return;
      }

      dispatch({
        type: "duplicate",
        sourceIndex: node.index,
        sourceZone: node.zoneCompound,
      });
    },
    [dispatch, outlineStore, node.index, node.zoneCompound]
  );

  if (!permissions.delete && !permissions.duplicate) {
    return null;
  }

  return (
    <div className={getClassName({ visible })}>
      {permissions.duplicate && (
        <IconButton onClick={duplicateItem} title="Duplicate" type="button">
          <Copy />
        </IconButton>
      )}
      {permissions.delete && (
        <IconButton onClick={deleteItem} title="Delete" type="button">
          <Trash />
        </IconButton>
      )}
    </div>
  );
};
