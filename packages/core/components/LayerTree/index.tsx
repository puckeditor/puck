/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ComponentConfig } from "../../types";
import { ItemSelector } from "../../lib/data/get-item";
import { scrollIntoView } from "../../lib/scroll-into-view";
import { ChevronDown, LayoutGrid, Layers, Type } from "lucide-react";
import { rootAreaId, rootDroppableId } from "../../lib/root-droppable-id";
import { createContext, useCallback, useContext } from "react";
import { ZoneStoreContext } from "../DropZone/context";
import { getFrame } from "../../lib/get-frame";
import { onScrollEnd } from "../../lib/on-scroll-end";
import { useAppStore, useAppStoreApi } from "../../store";
import { useShallow } from "zustand/react/shallow";
import { useContextStore } from "../../lib/use-context-store";

import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const getClassName = getClassNameFactory("LayerTree", styles);
const getClassNameLayer = getClassNameFactory("Layer", styles);

/** Flag so children don't create nested DnDContexts (enables cross-slot drags). */
const DndProvidedContext = createContext<boolean>(false);

/** Draggable/sortable wrapper for each list item */
const SortableItem = ({
                        id,
                        children,
                      }: {
  id: string;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </li>
  );
};

/** Zone is droppable so dropping on it appends to the end */
const DroppableZone = ({
                         id,
                         children,
                       }: {
  id: string;
  children: React.ReactNode;
}) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
};

const Layer = ({
                 index,
                 itemId,
                 zoneCompound,
               }: {
  index: number;
  itemId: string;
  zoneCompound: string;
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

  const selecedItemId = useAppStore((s) => s.selectedItem?.props.id);

  const isSelected =
    selecedItemId === itemId ||
    (itemSelector && itemSelector.zone === rootDroppableId && !zoneCompound);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const nodeData = useAppStore((s) => s.state.indexes.nodes[itemId]);

  const zonesForItem = useAppStore(
    useShallow((s) =>
      Object.keys(s.state.indexes.zones).filter(
        (z) => z.split(":")[0] === itemId
      )
    )
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

  return (
    <div
      className={getClassNameLayer({
        isSelected,
        isHovering,
        containsZone,
        childIsSelected,
      })}
    >
      <div className={getClassNameLayer("inner")}>
        <button
          type="button"
          className={getClassNameLayer("clickable")}
          onClick={() => {
            if (isSelected) {
              setItemSelector(null);
              return;
            }

            const frame = getFrame();
            const el = frame?.querySelector(
              `[data-puck-component="${itemId}"]`
            );

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

      {containsZone &&
        zonesForItem.map((subzone) => (
          <div key={subzone} className={getClassNameLayer("zones")}>
            <LayerTree zoneCompound={subzone} />
          </div>
        ))}
    </div>
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

  // Use slot label if provided
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
    useShallow((s) =>
      zoneCompound ? s.state.indexes.zones[zoneCompound]?.contentIds ?? [] : []
    )
  );

  // --- DnD ---
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { pressDelay: 150, tolerance: 5 })
  );

  /**
   * If dropping on:
   *  - a zone id: append at end of that zone
   *  - an item id with child slots: route into a "default" slot
   *      (prefers :content or :children, else first slot)
   *  - an item id without slots: insert before that item in its parent zone
   */
  const resolveDropTarget = useCallback(
    (overId: string, draggingId: string) => {
      const { state } = storeApi.getState();

      // Zone id → append
      if (state.indexes.zones[overId]) {
        const list = state.indexes.zones[overId].contentIds ?? [];
        return { destinationZone: overId, destinationIndex: list.length };
      }

      // Item id
      const overNode = state.indexes.nodes[overId];
      if (!overNode) return null;

      // Does this item have slots?
      const childZones = Object.keys(state.indexes.zones).filter(
        (z) => z.split(":")[0] === overId
      );

      if (childZones.length > 0) {
        // Pick a "default" slot
        const preferred =
          childZones.find((z) => z.endsWith(":content")) ||
          childZones.find((z) => z.endsWith(":children")) ||
          childZones[0];

        const list = state.indexes.zones[preferred]?.contentIds ?? [];
        return { destinationZone: preferred, destinationIndex: list.length };
      }

      // No slots → insert before this item in its parent zone
      const destinationZone = `${overNode.parentId}:${overNode.zone}`;
      const list = state.indexes.zones[destinationZone]?.contentIds ?? [];
      const rawIndex = list.indexOf(overId);
      if (rawIndex < 0) return null;

      // If dragging within same list downward, correct index by -1
      if (draggingId && list.includes(draggingId)) {
        const from = list.indexOf(draggingId);
        const corrected = from !== -1 && from < rawIndex ? rawIndex - 1 : rawIndex;
        return { destinationZone, destinationIndex: corrected };
      }

      return { destinationZone, destinationIndex: rawIndex };
    },
    [storeApi]
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!active?.id || !over?.id) return;

      const draggingId = String(active.id);
      const overId = String(over.id);

      const { state, dispatch } = storeApi.getState();

      // Source
      const srcNode = state.indexes.nodes[draggingId];
      if (!srcNode) return;

      const sourceZone = `${srcNode.parentId}:${srcNode.zone}`;
      const srcList = state.indexes.zones[sourceZone]?.contentIds ?? [];
      const sourceIndex = srcList.indexOf(draggingId);
      if (sourceIndex < 0) return;

      // Destination
      const target = resolveDropTarget(overId, draggingId);
      if (!target) return;

      const { destinationZone, destinationIndex } = target;

      // No-op
      if (sourceZone === destinationZone && sourceIndex === destinationIndex) return;

      // Move
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
  // --- end DnD ---

  const list = (
    <DroppableZone id={zoneCompound}>
      <ul className={getClassName()}>
        {contentIds.length === 0 && (
          <div className={getClassName("helper")}>No items</div>
        )}
        <SortableContext items={contentIds} strategy={verticalListSortingStrategy}>
          {contentIds.map((itemId, i) => (
            <SortableItem key={itemId} id={itemId}>
              <Layer index={i} itemId={itemId} zoneCompound={zoneCompound} />
            </SortableItem>
          ))}
        </SortableContext>
      </ul>
    </DroppableZone>
  );

  // If a parent already provided a DnDContext, don't create another one.
  if (dndProvided) {
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
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {list}
      </DndContext>
    </DndProvidedContext.Provider>
  );
};

// Keep default export for places that import default.
export default LayerTree;
