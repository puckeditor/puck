/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useContext, useState, useMemo, memo, useRef } from "react";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ChevronDown, GripVertical, LayoutGrid, Layers, Type } from "lucide-react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ComponentConfig } from "../../types";
import { ItemSelector } from "../../lib/data/get-item";
import { scrollIntoView } from "../../lib/scroll-into-view";
import { rootDroppableId } from "../../lib/root-droppable-id";
import { ZoneStoreContext } from "../DropZone/context";
import { getFrame } from "../../lib/get-frame";
import { onScrollEnd } from "../../lib/on-scroll-end";
import { useAppStore } from "../../store";
import { useShallow } from "zustand/react/shallow";
import { useContextStore } from "../../lib/use-context-store";
import { useSensors } from "../../lib/dnd/use-sensors";
import {
  flattenPuckZones,
  ZoneNode,
  ItemNode,
  removeChildrenOf,
  getCollapsedItems,
} from "./flatten";
import { projectDrop } from "./projection";

const getClassName = getClassNameFactory("LayerTree", styles);
const getClassNameLayer = getClassNameFactory("Layer", styles);

const DEBUG_DND = false; // Disable for production
const INDENTATION = 24;

/**
 * ZoneNode row - these ARE droppable
 */
const ZoneNodeRow = memo(
  ({
    node,
    index,
  }: {
    node: ZoneNode;
    index: number;
  }) => {
    const { ref } = useSortable({
      id: node.itemId,
      type: "outline-zone",
      index,
      data: { 
        kind: "zone",
        depth: node.depth,
        zoneCompound: node.zoneCompound,
      },
    });

    const zoneName = node.zoneCompound.split(":")[1] || "content";

    return (
      <li
        ref={ref}
        className={getClassName("zoneTitle")}
        style={{ paddingLeft: `${node.depth * INDENTATION}px` }}
        data-zone-node={node.itemId}
      >
        <div className={getClassName("zoneIcon")}>
          <Layers size="12" />
        </div>
        <span style={{ fontSize: "10px", textTransform: "capitalize" }}>
          {zoneName}
        </span>
      </li>
    );
  }
);
ZoneNodeRow.displayName = "ZoneNodeRow";

/**
 * Item row - displays actual components with drag handle
 */
const ItemNodeRow = memo(
  ({
    node,
    index,
    clone,
    isDragging,
    isSelected,
    config,
    canDrag,
    onSelectItem,
    onToggleExpand,
  }: {
    node: ItemNode;
    index: number;  
    clone?: boolean;
    isDragging?: boolean;
    isSelected?: boolean;
    config: any;
    canDrag: boolean;
    onSelectItem: (selector: ItemSelector | null) => void;
    onToggleExpand: (itemId: string) => void;
  }) => {
    const zoneStore = useContext(ZoneStoreContext);
    const { itemId, zoneCompound, nodeData, hasChildren } = node;

    const isHovering = useContextStore(
      ZoneStoreContext,
      (s) => s.hoveringComponent === itemId
    );

    const componentConfig: ComponentConfig | undefined =
      config.components[nodeData.data.type];
    const label =
      componentConfig?.["label"] ?? nodeData.data.type.toString();

    const { ref: sortableRef, handleRef } = useSortable({
      id: itemId,
      type: "outline-item",
      index,
      disabled: !canDrag || clone,
      data: { 
        kind: "item",
        depth: node.depth,
        zoneCompound: node.zoneCompound,
        index: node.index,
      },
    });

    return (
      <li
        ref={clone ? undefined : sortableRef}
        className={getClassNameLayer({
          isSelected,
          isHovering,
          containsZone: hasChildren,
          isDragging: isDragging && !clone,
          clone,
          isExpanded: node.isExpanded,
        })}
        style={{
          paddingLeft: clone ? 10 : node.depth * INDENTATION,
        }}
        aria-hidden={isDragging && !clone}
      >
        <div className={getClassNameLayer("inner")}>
          {/* Chevron */}
          {!clone && hasChildren && (
            <div
              className={getClassNameLayer("chevron")}
              title={node.isExpanded ? "Collapse" : "Expand"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(itemId);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleExpand(itemId);
                }
              }}
            >
              <ChevronDown size="12" />
            </div>
          )}

          <button
            type="button"
            className={getClassNameLayer("clickable")}
            onClick={() => {
              if (clone) return;

              if (isSelected) {
                onSelectItem(null);
                return;
              }

              const frame = getFrame();
              const el = frame?.querySelector(
                `[data-puck-component="${itemId}"]`
              );

              if (!el) {
                onSelectItem({ index: node.index, zone: zoneCompound });
                return;
              }

              scrollIntoView(el as HTMLElement);
              onScrollEnd(frame, () => {
                onSelectItem({ index: node.index, zone: zoneCompound });
              });
            }}
            onMouseEnter={(e) => {
              if (!clone) {
                e.stopPropagation();
                zoneStore.setState({ hoveringComponent: itemId });
              }
            }}
            onMouseLeave={(e) => {
              if (!clone) {
                e.stopPropagation();
                zoneStore.setState({ hoveringComponent: null });
              }
            }}
          >
            {!clone && canDrag && (
              <div
                ref={handleRef}
                className={getClassNameLayer("dragHandle")}
                title="Drag to reorder or move"
              >
                <GripVertical size="14" />
              </div>
            )}

            <div className={getClassNameLayer("title")}>
              <div className={getClassNameLayer("icon")}>
                {nodeData.data.type === "Text" ||
                nodeData.data.type === "Heading" ? (
                  <Type size="16" />
                ) : (
                  <LayoutGrid size="16" />
                )}
              </div>
              <div className={getClassNameLayer("name")}>{label}</div>
            </div>
          </button>
        </div>
      </li>
    );
  }
);
ItemNodeRow.displayName = "ItemNodeRow";

/**
 * Drop indicator
 */
const DropIndicator = memo(({ depth }: { depth: number }) => {
  return (
    <li
      className={getClassNameLayer({ indicator: true })}
      style={{ paddingLeft: depth * INDENTATION }}
    >
      <div className={getClassNameLayer("inner")} />
    </li>
  );
});
DropIndicator.displayName = "DropIndicator";

/**
 * LayerTree with its own DragDropProvider
 * Follows dnd-kit Tree example pattern
 */
export const LayerTree = ({
  label: _label,
  zoneCompound = rootDroppableId,
}: {
  label?: string;
  zoneCompound?: string;
}) => {
  const dispatch = useAppStore((s) => s.dispatch);

  const { zonesIndex, nodesIndex, selectedItemId, config, permissionsGetter } =
    useAppStore(
      useShallow((s) => ({
        zonesIndex: s.state.indexes.zones,
        nodesIndex: s.state.indexes.nodes,
        selectedItemId: s.selectedItem?.props.id,
        config: s.config,
        permissionsGetter: s.permissions.getPermissions,
      }))
    );

  const state = useMemo(
    () =>
      ({
        indexes: { zones: zonesIndex, nodes: nodesIndex },
      } as any),
    [zonesIndex, nodesIndex]
  );

  // Start with all items expanded
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    Object.keys(nodesIndex).forEach((id) => initial.add(id));
    Object.keys(zonesIndex).forEach((zc) => {
      const componentId = zc.split(":")[0];
      const zoneName = zc.split(":")[1] || "default-zone";
      initial.add(`${componentId}::zone::${zoneName}`);
    });
    return initial;
  });

  const sensors = useSensors({
    mouse: { distance: { value: 5 } },
  });

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Compute base flattened items
  // If zoneCompound is rootDroppableId, show ALL zones (unified tree)
  const baseFlattened = useMemo(() => {
    const allFlattened = flattenPuckZones(state, expandedItems, selectedItemId);
    
    if (zoneCompound === rootDroppableId) {
      // Show entire tree with all root zones
      const collapsedIds = getCollapsedItems(allFlattened);
      return removeChildrenOf(allFlattened, collapsedIds);
    }

    // Legacy: filter to specific zone (if needed for override scenarios)
    const zoneNodeIdx = allFlattened.findIndex(
      (item) => item.kind === "zone" && item.zoneCompound === zoneCompound
    );

    if (zoneNodeIdx === -1) return [];

    const zoneNode = allFlattened[zoneNodeIdx];
    const result: (ZoneNode | ItemNode)[] = _label ? [] : [zoneNode];

    const collectDescendants = (parentId: string, startIdx: number) => {
      for (let i = startIdx; i < allFlattened.length; i++) {
        const item = allFlattened[i];
        if (i > zoneNodeIdx && item.kind === "zone" && item.depth === 0) {
          break;
        }
        if (item.parentId === parentId) {
          result.push(item);
          if (item.hasChildren) {
            collectDescendants(item.itemId, i + 1);
          }
        }
      }
    };

    collectDescendants(zoneNode.itemId, zoneNodeIdx + 1);
    
    const collapsedIds = getCollapsedItems(result);
    return removeChildrenOf(result, collapsedIds);
  }, [state, expandedItems, selectedItemId, zoneCompound, _label]);

  // Use state for flattened items - will be manipulated during drag
  const [flattenedItems, setFlattenedItems] = useState(baseFlattened);
  const initialDepth = useRef(0);

  // Sync with base when not dragging
  const [activeId, setActiveId] = useState<string | null>(null);
  
  useMemo(() => {
    if (!activeId) {
      setFlattenedItems(baseFlattened);
    }
  }, [baseFlattened, activeId]);

  // Precompute permissions
  const itemPermissions = useMemo(() => {
    const perms = new Map<string, boolean>();
    for (const item of baseFlattened) {
      if (item.kind === "item") {
        const canDrag = permissionsGetter({ item: item.nodeData.data }).drag;
        perms.set(item.itemId, canDrag);
      }
    }
    return perms;
  }, [baseFlattened, permissionsGetter]);

  const handleSelectItem = useCallback(
    (selector: ItemSelector | null) => {
      dispatch({ type: "setUi", ui: { itemSelector: selector } });
    },
    [dispatch]
  );

  const handleDragStart = useCallback(
    (event: any) => {
      const {source} = event.operation;
      if (!source) return;

      const item = flattenedItems.find(({itemId}) => itemId === source.id);
      if (!item) return;

      if (DEBUG_DND) {
        console.log("[LayerTree] Drag Start:", source.id, item);
      }

      initialDepth.current = item.depth;
      setActiveId(source.id);
      
      dispatch({
        type: "setUi",
        ui: { isDragging: true },
        recordHistory: false,
      });
      document.body.style.setProperty("cursor", "grabbing");
    },
    [flattenedItems, dispatch]
  );

  const handleDragOver = useCallback(
    (event: any, manager: any) => {
      const {source, target} = event.operation;

      if (DEBUG_DND) {
        console.log("[LayerTree] onDragOver ENTRY:", {
          hasSource: !!source,
          hasTarget: !!target,
          sourceId: source?.id,
          targetId: target?.id,
          idsEqual: source?.id === target?.id,
        });
      }

      event.preventDefault();

      if (source && target && source.id !== target.id) {
        if (DEBUG_DND) {
          console.log("[LayerTree] onDragOver - condition passed, about to setFlattenedItems");
        }
        setFlattenedItems((current) => {
          const offsetLeft = manager.dragOperation.transform.x;
          const dragDepth = Math.round(offsetLeft / INDENTATION);

          if (DEBUG_DND) {
            console.log("[LayerTree] Drag Over:", {
              sourceId: source.id,
              targetId: target.id,
              offsetLeft,
              dragDepth,
            });
          }

          // Use our projection to compute the drop
          const projection = projectDrop(
            current,
            source.id,
            target.id,
            "before",
            dragDepth
          );

          if (!projection || !projection.valid) {
            if (DEBUG_DND) {
              console.log("[LayerTree] Invalid projection:", projection);
            }
            return current;
          }

          if (DEBUG_DND) {
            console.log("[LayerTree] Projection result:", projection);
          }

          const sourceIdx = current.findIndex((i) => i.itemId === source.id);
          if (sourceIdx === -1) return current;

          // Find all siblings under the destination parent
          const siblingIndices: number[] = [];
          for (let i = 0; i < current.length; i++) {
            const item = current[i];
            if (item.parentId === projection.parentZoneId && item.kind === "item") {
              siblingIndices.push(i);
            }
          }

          // Compute absolute insert index in the flat array
          let absoluteInsertIdx: number;
          
          if (siblingIndices.length === 0) {
            // No siblings - insert right after the parent ZoneNode
            const parentIdx = current.findIndex(
              (i) => i.itemId === projection.parentZoneId
            );
            absoluteInsertIdx = parentIdx + 1;
          } else if (projection.insertIndex < siblingIndices.length) {
            // Insert before the sibling at insertIndex
            absoluteInsertIdx = siblingIndices[projection.insertIndex];
          } else {
            // Insert at end - after last sibling
            absoluteInsertIdx = siblingIndices[siblingIndices.length - 1] + 1;
          }

          // Remove the item from its current position
          const newItems = [...current];
          const [movedItem] = newItems.splice(sourceIdx, 1);

          // Adjust insertion index if source was before target (classic splice rule)
          if (sourceIdx < absoluteInsertIdx) {
            absoluteInsertIdx--;
          }

          // Insert at new position with updated metadata
          newItems.splice(absoluteInsertIdx, 0, {
            ...movedItem,
            parentId: projection.parentZoneId,
            depth: projection.constrainedDepth,
          });

          return newItems;
        });
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: any) => {
      if (DEBUG_DND) {
        console.log("[LayerTree] Drag End:", {
          canceled: event.canceled,
          activeId,
        });
      }

      if (event.canceled || !activeId) {
        setFlattenedItems(baseFlattened);
        setActiveId(null);
        document.body.style.setProperty("cursor", "");
        dispatch({
          type: "setUi",
          ui: { isDragging: false },
          recordHistory: false,
        });
        return;
      }

      // Find where the item ended up
      const sourceItem = baseFlattened.find(
        (item) => item.itemId === activeId && item.kind === "item"
      );
      const finalItem = flattenedItems.find((item) => item.itemId === activeId);

      console.log("[DragEnd] Items found:", {
        sourceItem,
        finalItem,
        flattenedItemsCount: flattenedItems.length,
      });

      if (!sourceItem || sourceItem.kind !== "item" || !finalItem) {
        console.log("[DragEnd] Missing items - aborting");
        setFlattenedItems(baseFlattened);
        setActiveId(null);
        document.body.style.setProperty("cursor", "");
        dispatch({
          type: "setUi",
          ui: { isDragging: false },
          recordHistory: false,
        });
        return;
      }

      // Compute final insert index
      const finalIndex = flattenedItems.findIndex((i) => i.itemId === activeId);
      const itemsBeforeInSameParent = flattenedItems
        .slice(0, finalIndex)
        .filter((i) => i.parentId === finalItem.parentId && i.kind === "item").length;

      // Determine destination zone from parent
      let destinationZone = zoneCompound;
      if (finalItem.parentId) {
        const parentZone = flattenedItems.find(
          (i) => i.itemId === finalItem.parentId && i.kind === "zone"
        );
        
        if (parentZone && parentZone.kind === "zone") {
          destinationZone = parentZone.zoneCompound;
        }
      }

      const isReorder = sourceItem.zoneCompound === destinationZone;

      try {
        if (isReorder) {
          if (sourceItem.index !== itemsBeforeInSameParent) {
            dispatch({
              type: "reorder",
              sourceIndex: sourceItem.index,
              destinationIndex: itemsBeforeInSameParent,
              destinationZone,
            });
          }
        } else {
          dispatch({
            type: "move",
            sourceIndex: sourceItem.index,
            sourceZone: sourceItem.zoneCompound,
            destinationIndex: itemsBeforeInSameParent,
            destinationZone,
          });
        }

        dispatch({
          type: "setUi",
          ui: {
            itemSelector: {
              index: itemsBeforeInSameParent,
              zone: destinationZone,
            },
          },
          recordHistory: true,
        });
      } catch (error) {
        console.error("[LayerTree] Error during dispatch:", error);
      }

      // Reset
      queueMicrotask(() => {
        setFlattenedItems(baseFlattened);
        setActiveId(null);
        document.body.style.setProperty("cursor", "");
        dispatch({
          type: "setUi",
          ui: { isDragging: false },
          recordHistory: false,
        });
      });
    },
    [activeId, flattenedItems, baseFlattened, zoneCompound, dispatch]
  );

  const activeItem = useMemo(
    () =>
      activeId
        ? baseFlattened.find(
            (item) => item.itemId === activeId && item.kind === "item"
          )
        : null,
    [activeId, baseFlattened]
  );

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={getClassName()}>
        {_label && (
          <div className={getClassName("zoneTitle")}>
            <div className={getClassName("zoneIcon")}>
              <Layers size="16" />
            </div>
            {_label}
          </div>
        )}
        <ul className={getClassName()}>
          {flattenedItems.length === 0 && (
            <div className={getClassName("helper")}>No items</div>
          )}
          {flattenedItems.map((item, idx) => {
            // Skip root-level ZoneNodes (depth 0) - they're just organizational
            if (item.kind === "zone" && item.depth === 0) {
              return null;
            }
            
            // Render nested ZoneNode labels (depth > 0)
            if (item.kind === "zone") {
              return (
                <ZoneNodeRow key={item.itemId} node={item} index={idx} />
              );
            }

            // Render ItemNode
            const canDrag = itemPermissions.get(item.itemId) ?? false;

            return (
              <ItemNodeRow
                key={item.itemId}
                node={item}
                index={idx}
                isDragging={item.itemId === activeId}
                isSelected={selectedItemId === item.itemId}
                config={config}
                canDrag={canDrag}
                onSelectItem={handleSelectItem}
                onToggleExpand={toggleExpanded}
              />
            );
          })}
        </ul>

        {/* Drag overlay using DragOverlay component */}
        <DragOverlay>
          {(source) => {
            if (!activeItem || activeItem.kind !== "item") return null;

            return (
              <div
                className={getClassNameLayer({ clone: true })}
                style={{ paddingLeft: 10 }}
              >
                <div className={getClassNameLayer("inner")}>
                  <div className={getClassNameLayer("dragHandle")}>
                    <GripVertical size="14" />
                  </div>
                  <div className={getClassNameLayer("title")}>
                    <div className={getClassNameLayer("icon")}>
                      {activeItem.nodeData.data.type === "Text" ||
                      activeItem.nodeData.data.type === "Heading" ? (
                        <Type size="16" />
                      ) : (
                        <LayoutGrid size="16" />
                      )}
                    </div>
                    <div className={getClassNameLayer("name")}>
                      {config.components[activeItem.nodeData.data.type]?.[
                        "label"
                      ] ?? activeItem.nodeData.data.type.toString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </DragOverlay>
      </div>
    </DragDropProvider>
  );
};
