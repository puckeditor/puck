/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ComponentConfig } from "../../types";
import { ItemSelector } from "../../lib/data/get-item";
import { scrollIntoView } from "../../lib/scroll-into-view";
import { ChevronDown, LayoutGrid, Layers, Type } from "lucide-react";
import { rootAreaId, rootDroppableId } from "../../lib/root-droppable-id";
import React, {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { ZoneStoreContext } from "../DropZone/context";
import { getFrame } from "../../lib/get-frame";
import { onScrollEnd } from "../../lib/on-scroll-end";
import { useAppStore, useAppStoreApi } from "../../store";
import { useContextStore } from "../../lib/use-context-store";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragCancelEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const getClassName = getClassNameFactory("LayerTree", styles);
const getClassNameLayer = getClassNameFactory("Layer", styles);

const DndProvidedContext = createContext<boolean>(false);

/** Sortable "row" helper: attaches drag/overlay to the HEADER DIV only */
function SortableRowHeader({
                             id,
                             children,
                           }: {
  id: string;
  children: (args: {
    rowDragOver: boolean;
    setHeaderRef: (n: HTMLElement | null) => void;
    attributes: any;
    listeners: any;
    style: React.CSSProperties;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Row-level droppable to detect hover over the row without sorting
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `open:${id}`,
  });

  const setHeaderRef = useCallback(
    (node: HTMLElement | null) => {
      setSortableRef(node);
      setDroppableRef(node);
    },
    [setSortableRef, setDroppableRef]
  );

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <>
      {children({
        rowDragOver: isOver,
        setHeaderRef,
        attributes,
        listeners,
        style,
      })}
    </>
  );
}

/** Zone wrapper: droppable with soft highlight when over whole zone */
const DroppableZone = ({
                         id,
                         children,
                       }: {
  id: string;
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={
        isOver
          ? {
            outline: "2px dashed var(--puck-accent, #3b82f6)",
            outlineOffset: 2,
            background: "rgba(59,130,246,0.06)",
            borderRadius: 6,
          }
          : undefined
      }
    >
      {children}
    </div>
  );
};

/** Thin, precise droppable between items and at list end */
const DropSeparator = ({ zone, index }: { zone: string; index: number }) => {
  const id = `sep:${encodeURIComponent(zone)}:${index}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <li
      ref={setNodeRef}
      aria-hidden
      style={{
        listStyle: "none",
        height: 8,
        margin: "2px 0",
        borderRadius: 4,
        background: isOver ? "rgba(59,130,246,0.35)" : "transparent",
      }}
    />
  );
};

/** One full list item: header (sortable) + its child zones (inside same <li>) */
const LayerItem = ({
                     index,
                     itemId,
                     zoneCompound,
                     rowDragOver,
                     setHeaderRef,
                     attributes,
                     listeners,
                     style,
                   }: {
  index: number;
  itemId: string;
  zoneCompound: string;
  rowDragOver: boolean;
  setHeaderRef: (n: HTMLElement | null) => void;
  attributes: any;
  listeners: any;
  style: React.CSSProperties;
}) => {
  const config = useAppStore((s) => s.config);
  const itemSelector = useAppStore((s) => s.state.ui.itemSelector);
  const dispatch = useAppStore((s) => s.dispatch);

  const setItemSelector = useCallback(
    (itemSelector: ItemSelector | null) => {
      dispatch({ type: "setUi", ui: { itemSelector } });
    },
    [dispatch]
  );

  const selectedItemId = useAppStore((s) => s.selectedItem?.props.id);
  const nodeData = useAppStore((s) => s.state.indexes.nodes[itemId]);

  const isSelected =
    selectedItemId === itemId ||
    (itemSelector && itemSelector.zone === rootDroppableId && !zoneCompound);

  const zonesIndex = useAppStore((s) => s.state.indexes.zones);
  const zonesForItem = useMemo(
    () => Object.keys(zonesIndex).filter((z) => z.split(":")[0] === itemId),
    [zonesIndex, itemId]
  );
  const containsZone = zonesForItem.length > 0;

  const zoneStore = useContext(ZoneStoreContext);
  const isHovering = useContextStore(
    ZoneStoreContext,
    (s) => s.hoveringComponent === itemId
  );

  const childIsSelected = useAppStore((s) => {
    const selectedData = s.state.indexes.nodes[s.selectedItem?.props.id];
    return (
      selectedData?.path.some((candidate: string) => {
        const [candidateId] = candidate.split(":");
        return candidateId === itemId;
      }) ?? false
    );
  });

  const componentConfig: ComponentConfig | undefined =
    config.components[nodeData.data.type];
  const label = componentConfig?.["label"] ?? nodeData.data.type.toString();

  // Open when: selected, child selected, or row drag-over (overlay)
  const showSlots = containsZone && (isSelected || childIsSelected || rowDragOver);

  return (
    <li
      className={getClassNameLayer({
        isSelected,
        isHovering,
        containsZone,
        childIsSelected,
      })}
    >
      {/* HEADER DIV is the sortable target */}
      <div
        ref={setHeaderRef}
        {...attributes}
        {...listeners}
        style={style}
        className={getClassNameLayer("inner")}
      >
        <button
          type="button"
          className={getClassNameLayer("clickable")}
          onClick={() => {
            if (isSelected) {
              setItemSelector(null);
              return;
            }
            const frame = getFrame();
            const el = frame?.querySelector(`[data-puck-component="${itemId}"]`);
            if (!el) {
              setItemSelector({ index, zone: zoneCompound });
              return;
            }
            scrollIntoView(el as HTMLElement);
            onScrollEnd(frame, () => {
              setItemSelector({ index, zone: zoneCompound });
            });
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            zoneStore.setState({ hoveringComponent: itemId });
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            zoneStore.setState({ hoveringComponent: null });
          }}
        >
          {containsZone && (
            <div
              className={getClassNameLayer("chevron")}
              title={isSelected ? "Collapse" : "Expand"}
            >
              <ChevronDown size="12" />
            </div>
          )}
          <div className={getClassNameLayer("title")}>
            <div className={getClassNameLayer("icon")}>
              {nodeData.data.type === "Text" || nodeData.data.type === "Heading" ? (
                <Type size="16" />
              ) : (
                <LayoutGrid size="16" />
              )}
            </div>
            <div className={getClassNameLayer("name")}>{label}</div>
          </div>
        </button>
      </div>

      {/* CHILD ZONES render inside the same <li> (so CSS works), but are NOT part of the sortable ref */}
      {showSlots &&
        zonesForItem.map((subzone) => (
          <div key={subzone} className={getClassNameLayer("zones")}>
            <LayerTree zoneCompound={subzone} />
          </div>
        ))}
    </li>
  );
};

export const LayerTree = ({
                            label: _label,
                            zoneCompound,
                          }: {
  label?: string;
  zoneCompound: string;
}) => {
  const storeApi = useAppStoreApi();
  const dndProvided = useContext(DndProvidedContext);

  // Slot/zone label
  const label = useAppStore((s) => {
    if (_label) return _label;
    if (zoneCompound === rootDroppableId) return;
    const [componentId, slotId] = zoneCompound.split(":");
    const componentType = s.state.indexes.nodes[componentId]?.data.type;
    const configForComponent =
      componentType && componentType !== rootAreaId
        ? s.config.components[componentType]
        : s.config.root;
    return configForComponent?.fields?.[slotId]?.label ?? slotId;
  });

  const contentIds = useAppStore(
    (s) => s.state.indexes.zones[zoneCompound]?.contentIds ?? []
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { pressDelay: 150, tolerance: 5 })
  );

  // --- Auto-open on drag via selection; keep open inside subtree ---
  const prevSelectionRef = useRef<ItemSelector | null>(null);
  const lastOpenedIdRef = useRef<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearOpenTimer = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const candidateItemWithSlots = (overId: string | null): string | null => {
    if (!overId) return null;
    const { state } = storeApi.getState();
    const s = String(overId);

    if (s.startsWith("open:")) {
      const id = s.slice(5);
      const hasZones = Object.keys(state.indexes.zones).some((z) => z.startsWith(id + ":"));
      return hasZones ? id : null;
    }
    if (s.startsWith("sep:")) {
      const [, encZone] = s.split(":");
      const zone = decodeURIComponent(encZone);
      const [parentId] = zone.split(":");
      const hasZones = Object.keys(state.indexes.zones).some((z) => z.startsWith(parentId + ":"));
      return hasZones ? parentId : null;
    }
    if (state.indexes.zones[s]) {
      const [parentId] = s.split(":");
      const hasZones = Object.keys(state.indexes.zones).some((z) => z.startsWith(parentId + ":"));
      return hasZones ? parentId : null;
    }
    if (state.indexes.nodes[s]) {
      const hasZones = Object.keys(state.indexes.zones).some((z) => z.startsWith(s + ":"));
      return hasZones ? s : null;
    }
    return null;
  };

  const isInsideExpandedSubtree = (overId: string | null, expandedId: string | null) => {
    if (!overId || !expandedId) return false;
    const { state } = storeApi.getState();
    const s = String(overId);

    if (s.startsWith("open:")) return s.slice(5) === expandedId;
    if (s.startsWith("sep:")) {
      const [, encZone] = s.split(":");
      const zone = decodeURIComponent(encZone);
      return zone.startsWith(expandedId + ":");
    }
    if (state.indexes.zones[s]) return s.startsWith(expandedId + ":");
    if (state.indexes.nodes[s]) {
      if (s === expandedId) return true;
      const node = state.indexes.nodes[s];
      return node.path?.some((p: string) => p.startsWith(expandedId + ":")) ?? false;
    }
    return false;
  };

  const selectItemById = (id: string) => {
    const { state, dispatch } = storeApi.getState();
    const node = state.indexes.nodes[id];
    if (!node) return;
    const zone = `${node.parentId}:${node.zone}`;
    const list = state.indexes.zones[zone]?.contentIds ?? [];
    const index = list.indexOf(id);
    if (index < 0) return;
    dispatch({ type: "setUi", ui: { itemSelector: { index, zone } }, recordHistory: false });
  };

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const overId = e.over?.id ? String(e.over.id) : null;

    if (lastOpenedIdRef.current && isInsideExpandedSubtree(overId, lastOpenedIdRef.current)) {
      clearOpenTimer();
      return;
    }

    const candidate = candidateItemWithSlots(overId);
    if (!candidate) {
      clearOpenTimer();
      if (lastOpenedIdRef.current) {
        const { dispatch } = storeApi.getState();
        dispatch({
          type: "setUi",
          ui: { itemSelector: prevSelectionRef.current ?? null },
          recordHistory: false,
        });
        lastOpenedIdRef.current = null;
      }
      return;
    }

    if (!lastOpenedIdRef.current) {
      const { state } = storeApi.getState();
      prevSelectionRef.current = state.ui.itemSelector ?? null;
    }

    if (lastOpenedIdRef.current === candidate) {
      clearOpenTimer();
      return;
    }

    const s = String(overId);
    const { state } = storeApi.getState();
    const isRowOverlay = s.startsWith("open:");
    const isZone = !!state.indexes.zones[s];
    const isSeparator = s.startsWith("sep:");

    clearOpenTimer();
    if (isRowOverlay || isZone || isSeparator) {
      selectItemById(candidate);
      lastOpenedIdRef.current = candidate;
    } else {
      openTimer.current = setTimeout(() => {
        selectItemById(candidate);
        lastOpenedIdRef.current = candidate;
      }, 100);
    }
  }, [storeApi]);

  // Prefer: row overlays → separators → zones → default
  const preferOpenSepZonesCollision: CollisionDetection = useCallback((args) => {
    const pri = pointerWithin(args).length ? pointerWithin(args) : rectIntersection(args);
    const openHits = pri.filter((c) => String(c.id).startsWith("open:"));
    if (openHits.length) return openHits;
    const sepHits = pri.filter((c) => String(c.id).startsWith("sep:"));
    if (sepHits.length) return sepHits;
    const zoneHits = pri.filter(
      (c) =>
        String(c.id).includes(":") &&
        !String(c.id).startsWith("open:") &&
        !String(c.id).startsWith("sep:")
    );
    if (zoneHits.length) return zoneHits;
    return pri.length ? pri : closestCenter(args);
  }, []);

  const resolveDropTarget = useCallback(
    (rawOverId: string, draggingId: string) => {
      const { state } = storeApi.getState();

      if (rawOverId.startsWith("sep:")) {
        const parts = rawOverId.split(":");
        const encZone = parts[1];
        const idxStr = parts[2];
        const zone = decodeURIComponent(encZone);
        const list = state.indexes.zones[zone]?.contentIds ?? [];
        let destinationIndex = Number.parseInt(idxStr, 10) || 0;

        const srcNode = state.indexes.nodes[draggingId];
        const sourceZone = `${srcNode.parentId}:${srcNode.zone}`;
        if (sourceZone === zone) {
          const from = list.indexOf(draggingId);
          if (from !== -1 && from < destinationIndex) destinationIndex -= 1;
        }
        return { destinationZone: zone, destinationIndex };
      }

      const overId = rawOverId.startsWith("open:") ? rawOverId.slice(5) : rawOverId;

      if (state.indexes.zones[overId]) {
        const list = state.indexes.zones[overId].contentIds ?? [];
        return { destinationZone: overId, destinationIndex: list.length };
      }

      const overNode = state.indexes.nodes[overId];
      if (!overNode) return null;

      const childZones = Object.keys(state.indexes.zones).filter(
        (z) => z.split(":")[0] === overId
      );
      if (childZones.length > 0) {
        const preferred =
          childZones.find((z) => z.endsWith(":content")) ||
          childZones.find((z) => z.endsWith(":children")) ||
          childZones[0];
        const list = state.indexes.zones[preferred]?.contentIds ?? [];
        return { destinationZone: preferred, destinationIndex: list.length };
      }

      const destinationZone = `${overNode.parentId}:${overNode.zone}`;
      const list = state.indexes.zones[destinationZone]?.contentIds ?? [];
      let destinationIndex = list.indexOf(overId);
      if (destinationIndex < 0) return null;

      const srcNode = state.indexes.nodes[draggingId];
      const sourceZone = `${srcNode.parentId}:${srcNode.zone}`;
      if (sourceZone === destinationZone) {
        const from = list.indexOf(draggingId);
        if (from !== -1 && from < destinationIndex) destinationIndex -= 1;
      }
      return { destinationZone, destinationIndex };
    },
    [storeApi]
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      if (openTimer.current) clearOpenTimer();

      if (lastOpenedIdRef.current !== null) {
        const { dispatch } = storeApi.getState();
        dispatch({
          type: "setUi",
          ui: { itemSelector: prevSelectionRef.current ?? null },
          recordHistory: false,
        });
        lastOpenedIdRef.current = null;
      }

      const { active, over } = e;
      if (!active?.id || !over?.id) return;

      const draggingId = String(active.id);
      const overId = String(over.id);

      const { state, dispatch } = storeApi.getState();
      const srcNode = state.indexes.nodes[draggingId];
      if (!srcNode) return;

      const sourceZone = `${srcNode.parentId}:${srcNode.zone}`;
      const srcList = state.indexes.zones[sourceZone]?.contentIds ?? [];
      const sourceIndex = srcList.indexOf(draggingId);
      if (sourceIndex < 0) return;

      const target = resolveDropTarget(overId, draggingId);
      if (!target) return;

      const { destinationZone, destinationIndex } = target;

      if (sourceZone === destinationZone && sourceIndex === destinationIndex) return;

      dispatch({
        type: "move",
        sourceZone,
        destinationZone,
        sourceIndex,
        destinationIndex,
      });
    },
    [storeApi, resolveDropTarget]
  );

  const onDragCancel = useCallback((_: DragCancelEvent) => {
    clearOpenTimer();
    if (lastOpenedIdRef.current !== null) {
      const { dispatch } = storeApi.getState();
      dispatch({
        type: "setUi",
        ui: { itemSelector: prevSelectionRef.current ?? null },
        recordHistory: false,
      });
      lastOpenedIdRef.current = null;
    }
  }, [storeApi]);

  const list = (
    <DroppableZone id={zoneCompound}>
      <ul className={getClassName()}>
        {contentIds.length === 0 && (
          <>
            <DropSeparator zone={zoneCompound} index={0} />
            <div className={getClassName("helper")}>No items</div>
            <DropSeparator zone={zoneCompound} index={0} />
          </>
        )}
        <SortableContext items={contentIds} strategy={verticalListSortingStrategy}>
          {contentIds.map((itemId, i) => (
            <Fragment key={itemId}>
              {/* precise insertion before each item */}
              <DropSeparator zone={zoneCompound} index={i} />
              <SortableRowHeader id={itemId}>
                {({ rowDragOver, setHeaderRef, attributes, listeners, style }) => (
                  <LayerItem
                    index={i}
                    itemId={itemId}
                    zoneCompound={zoneCompound}
                    rowDragOver={rowDragOver}
                    setHeaderRef={setHeaderRef}
                    attributes={attributes}
                    listeners={listeners}
                    style={style}
                  />
                )}
              </SortableRowHeader>
            </Fragment>
          ))}
          {/* end insertion */}
          {contentIds.length > 0 && (
            <DropSeparator zone={zoneCompound} index={contentIds.length} />
          )}
        </SortableContext>
      </ul>
    </DroppableZone>
  );

  const sensors2 = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { pressDelay: 150, tolerance: 5 })
  );

  if (useContext(DndProvidedContext)) {
    return (
      <>
        {label && (
          <div className={getClassName("zoneTitle")}>
            <div className={getClassName("zoneIcon")}>
              <Layers size="16" />
            </div>
            {label}
          </div>
        )}
        {list}
      </>
    );
  }

  return (
    <DndProvidedContext.Provider value={true}>
      {label && (
        <div className={getClassName("zoneTitle")}>
          <div className={getClassName("zoneIcon")}>
            <Layers size="16" />
          </div>
          {label}
        </div>
      )}
      <DndContext
        sensors={sensors2}
        collisionDetection={preferOpenSepZonesCollision}
        onDragOver={handleDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {list}
      </DndContext>
    </DndProvidedContext.Provider>
  );
};

export default LayerTree;
