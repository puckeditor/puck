import { Copy, Eye, EyeOff, Trash } from "lucide-react";
import { SyntheticEvent, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import getClassNameFactory from "../../../../lib/get-class-name-factory";
import { getItem } from "../../../../lib/data/get-item";
import { useAppStore } from "../../../../store";
import { IconButton } from "../../../IconButton";

import { useOutlineDndStoreApi } from "../../lib/store";
import { LayerNode } from "../../types";

import styles from "./styles.module.css";
import { useMessage } from "../../../../lib/use-message";

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
        edit: itemPermissions.edit,
      };
    })
  );

  const hideMsg = useMessage("outline-item-hide");
  const showMsg = useMessage("outline-item-show");
  const duplicateMsg = useMessage("outline-item-duplicate");
  const deleteMsg = useMessage("outline-item-delete");

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

  const toggleVisibility = useCallback(
    (e: SyntheticEvent<Element>) => {
      // Don't select the component
      e.stopPropagation();

      if (outlineStore.getState().status !== "idle") {
        return;
      }

      dispatch({
        type: "setVisibility",
        id: node.itemId,
        hidden: !node.hidden,
      });
    },
    [dispatch, outlineStore, node.itemId, node.hidden]
  );

  if (!permissions.delete && !permissions.duplicate && !permissions.edit) {
    return null;
  }

  return (
    <div className={getClassName({ visible })}>
      {permissions.edit !== false && (
        <span style={{ visibility: node.hidden ? 'visible' : 'unset' }}>
          <IconButton
            onClick={toggleVisibility}
            title={node.hidden ? showMsg : hideMsg}
            type="button"
          >
            {node.hidden ? <EyeOff /> : <Eye />}
          </IconButton>
        </span>
      )}
      {permissions.duplicate && (
        <IconButton onClick={duplicateItem} title={duplicateMsg} type="button">
          <Copy />
        </IconButton>
      )}
      {permissions.delete && (
        <IconButton onClick={deleteItem} title={deleteMsg} type="button">
          <Trash />
        </IconButton>
      )}
    </div>
  );
};
