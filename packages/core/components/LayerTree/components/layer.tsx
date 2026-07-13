import { ChevronRight, LayoutGrid, Type } from "lucide-react";
import { ForwardedRef, forwardRef, useCallback, useContext } from "react";

import getClassNameFactory from "../../../lib/get-class-name-factory";
import { ItemSelector } from "../../../lib/data/get-item";
import { useContextStore } from "../../../lib/use-context-store";
import { useAppStore } from "../../../store";

import { ZoneStoreContext } from "../../DropZone/context";
import { IconButton } from "../../IconButton";

import { useOutlineDndStoreApi } from "../lib/store";
import { useOutlineRowDnd } from "../lib/dnd/use-outline-row-dnd";
import styles from "../styles.module.css";
import { LayerNode } from "../types";

import { LayerActions } from "./layer-actions";
import { LayerTreeZone } from "./layer-tree-zone";

const getClassName = getClassNameFactory("Layer", styles);

/**
 * Renders a single outline item: caret, select button and actions, followed by the
 * item's child zones when expanded.
 */
export const Layer = forwardRef(function Layer(
  {
    dataIndex,
    depth,
    isSelected,
    node,
    selectedId,
  }: {
    dataIndex?: number;
    depth: number;
    isSelected: boolean;
    node: LayerNode;
    selectedId: string | null;
  },
  ref: ForwardedRef<HTMLLIElement>
) {
  const dispatch = useAppStore((s) => s.dispatch);
  const isExpanded = useAppStore(
    (s) => s.state.ui.itemExpanded?.[node.itemId] ?? false
  );
  const isHovering = useContextStore(
    ZoneStoreContext,
    (s) => s.hoveringComponent === node.itemId
  );
  const {
    indicatorPosition,
    isDragSource,
    isExpandCandidate,
    isTempExpanded,
    rowRef,
  } = useOutlineRowDnd({
    componentType: node.componentType,
    index: node.index,
    itemId: node.itemId,
    zoneCompound: node.zoneCompound,
  });

  const zoneStore = useContext(ZoneStoreContext);
  const outlineStore = useOutlineDndStoreApi();

  const containsZone = node.childZones.length > 0;

  const setItemSelector = useCallback(
    (itemSelector: ItemSelector | null) => {
      dispatch({ type: "setUi", ui: { itemSelector } });
    },
    [dispatch]
  );

  const shouldBeExpanded = isExpanded || isTempExpanded;

  return (
    <li
      ref={ref}
      className={getClassName({
        containsZone,
        indicatorAfter: indicatorPosition === "after",
        indicatorBefore: indicatorPosition === "before",
        isDragSource,
        isExpandCandidate,
        isExpanded: shouldBeExpanded,
        isHovering,
        isSelected,
      })}
      data-index={dataIndex}
      data-puck-layer-tree-id={node.itemId}
    >
      <div
        className={getClassName("inner")}
        ref={rowRef}
        onMouseEnter={(e) => {
          e.stopPropagation();

          // Hovering rows mid-drag would light up canvas overlays
          if (outlineStore.getState().status !== "idle") {
            return;
          }

          zoneStore.setState({ hoveringComponent: node.itemId });
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          zoneStore.setState({ hoveringComponent: null });
        }}
      >
        <div className={getClassName("caret")}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();

              if (outlineStore.getState().status !== "idle") {
                return;
              }

              dispatch({
                type: "setUi",
                ui: (previous) => {
                  const newItemExpanded = {
                    ...previous.itemExpanded,
                  };

                  if (previous.itemExpanded?.[node.itemId]) {
                    delete newItemExpanded[node.itemId];
                  } else {
                    newItemExpanded[node.itemId] = true;
                  }

                  return {
                    itemExpanded: newItemExpanded,
                  };
                },
                recordHistory: false,
              });
            }}
            title={isExpanded ? "Collapse" : "Expand"}
            type="button"
          >
            <ChevronRight />
          </IconButton>
        </div>
        <div className={getClassName("content")}>
          <button
            type="button"
            className={getClassName("clickable")}
            onClick={() => {
              // Clicks during or just after a drag must not change selection
              if (outlineStore.getState().status !== "idle") {
                return;
              }

              setItemSelector({
                index: node.index,
                zone: node.zoneCompound,
              });

              zoneStore.getState().scrollToComponent(node.itemId);
            }}
          >
            <div className={getClassName("title")}>
              <div className={getClassName("icon")}>
                {node.componentType === "Text" ||
                node.componentType === "Heading" ? (
                  // Sized in CSS via --puck-outline-icon-size
                  <Type />
                ) : (
                  <LayoutGrid />
                )}
              </div>
              <div className={getClassName("name")}>{node.label}</div>
            </div>
          </button>
          <LayerActions node={node} visible={isHovering && !isDragSource} />
        </div>
      </div>
      {containsZone &&
        shouldBeExpanded &&
        node.childZones.map((childZone) => (
          <div key={childZone.zoneCompound} className={getClassName("zones")}>
            {/* NB: LayerTreeZone has a circular dependency with Layer, but it's safe because it's only used during rendering */}
            <LayerTreeZone
              depth={depth + 1}
              selectedId={selectedId}
              tree={childZone}
            />
          </div>
        ))}
    </li>
  );
});
