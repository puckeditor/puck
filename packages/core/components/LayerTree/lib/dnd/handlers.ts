import type {
  DragOverEvent,
  DragMoveEvent,
  BeforeDragStartEvent,
  DragDropManager,
  DragEndEvent,
} from "@dnd-kit/dom";
import { effect } from "@dnd-kit/state";
import { StoreApi } from "zustand";

import { useAppStoreApi } from "../../../../store";
import { getItem } from "../../../../lib/data/get-item";
import { getFrame } from "../../../../lib/get-frame";
import { moveComponent } from "../../../../lib/move-component";
import { componentDataHasSlots } from "../../../../lib/data/component-has-slots";
import {
  getCollisionPosition,
  getInsertIndex,
} from "../../../../lib/dnd/get-insert-index";

import { OutlineDndStore } from "../store";

import {
  OutlineDndData,
  OutlineRowDndData,
  zoneAcceptsComponent,
} from "./compute";

export type OutlineDragContext = {
  /** The outline drag context (store) */
  outlineDndStore: StoreApi<OutlineDndStore>;
  /** The Puck app store */
  appStore: ReturnType<typeof useAppStoreApi>;
  /** The function to scroll to a component provided by the Puck zone store */
  scrollToComponent: (id: string) => void;
};

const SCROLL_SETTLE_FRAMES = 2;
const SCROLL_SETTLE_MAX_FRAMES = 60;

/**
 * Scrolls to a component once its canvas element stops moving.
 *
 * Zones apply new content asynchronously after a drop (use-content-with-preview defers
 * until dnd-kit finishes rendering), so scrolling on a fixed schedule races
 * the re-render and targets the element's pre-move position.
 */
const scrollToComponentWhenSettled = (
  id: string,
  scrollToComponent: OutlineDragContext["scrollToComponent"]
) => {
  let lastTop: number | null | undefined;
  let stableFrames = 0;
  let totalFrames = 0;

  // Check if the component has stopped moving after two frames (or 60 frames/1second max),
  // then scroll to it.
  const check = () => {
    const el = getFrame()?.querySelector(`[data-puck-component="${id}"]`);
    const top = el ? el.getBoundingClientRect().top : null;

    // A null position is also "stable": virtualized zones may not mount the
    // element at all, and the virtualizer resolves the scroll by index
    stableFrames = top === lastTop ? stableFrames + 1 : 0;
    lastTop = top;
    totalFrames += 1;

    if (
      stableFrames >= SCROLL_SETTLE_FRAMES ||
      totalFrames >= SCROLL_SETTLE_MAX_FRAMES
    ) {
      scrollToComponent(id);
      return;
    }

    requestAnimationFrame(check);
  };

  requestAnimationFrame(check);
};

/**
 * Fences the preview off during outline drags (Preview disables pointer events when `data-puck-outline-dragging` is set).
 *
 * Without this, dragging an outline row over the preview scrolls the canvas.
 */
const setPreviewFence = (enabled: boolean) => {
  if (typeof document === "undefined") return;

  const frameEl = document.getElementById("preview-frame");

  if (enabled) {
    frameEl?.setAttribute("data-puck-outline-dragging", "true");
  } else {
    frameEl?.removeAttribute("data-puck-outline-dragging");
  }
};

/**
 * Starts a drag operation in the outline. Checks permissions and sets up the outline dnd state.
 *
 * @param event The dnd-kit event
 * @param ctx The outline drag context
 */
export const onOutlineBeforeDragStart = (
  event: BeforeDragStartEvent,
  ctx: OutlineDragContext
): void => {
  const source = event.operation.source;
  const data = source?.data as OutlineRowDndData | undefined;

  if (!source || !data) return;

  const appState = ctx.appStore.getState();
  const item = getItem(
    { zone: data.zoneCompound, index: data.index },
    appState.state
  );

  // The permission check comes before any side effect, so a denied drag
  // leaves no state behind
  if (!item || !appState.permissions.getPermissions({ item }).drag) {
    event.preventDefault();

    return;
  }

  ctx.outlineDndStore.getState().startDrag({
    itemId: data.itemId,
    zoneCompound: data.zoneCompound,
    index: data.index,
    componentType: data.componentType,
  });

  setPreviewFence(true);

  // Selection is deliberately left untouched: unlike the canvas, losing the
  // selection mid-drag would surprise the user for no benefit
  appState.dispatch({
    type: "setUi",
    ui: { isDragging: true },
    recordHistory: false,
  });
};

/**
 * Expands items and keeps the outline's drop target and line indicator up to date as the dragged row moves.
 *
 * Derives the line indicator and commit payload from the current drop target.
 *
 * Driven from both dragover (target changes) and dragmove: crossing a row's
 * midpoint flips before/after without changing targets, and dnd-kit only
 * fires dragover on target change.
 *
 * @param event The dnd-kit event
 * @param manager The dnd-kit DragDropManager
 * @param ctx The outline drag context
 */
export const onOutlineDragMove = (
  event: DragOverEvent | DragMoveEvent,
  manager: DragDropManager,
  ctx: OutlineDragContext
) => {
  const outlineStore = ctx.outlineDndStore.getState();
  const dragged = outlineStore.draggedRow;

  if (!dragged) return;

  const target = event.operation.target;

  // Over a gap between rows, or outside the outline entirely
  if (!target) {
    outlineStore.cancelPendingExpand();
    outlineStore.clearTarget();

    return;
  }

  const targetData = target.data as OutlineDndData;

  // Over a zone (e.g. label, empty zone), set it as always inside, no expansion needed
  if (targetData.kind === "zone") {
    outlineStore.cancelPendingExpand();
    outlineStore.setTarget(
      { targetId: target.id.toString(), position: "inside" },
      { zone: targetData.zoneCompound, index: 0 }
    );

    return;
  }

  // Is a row (i.e. a component layer)
  const { config, state } = ctx.appStore.getState();
  const indexes = state.indexes;
  const cache = outlineStore.acceptCache;

  // Check it accepts the component and set it as the target
  if (
    zoneAcceptsComponent(
      cache,
      targetData.zoneCompound,
      dragged.componentType,
      config,
      indexes
    )
  ) {
    const collisionData = manager.collisionObserver.collisions[0]?.data;
    const position = getCollisionPosition(collisionData?.direction);

    outlineStore.setTarget(
      { targetId: target.id.toString(), position },
      {
        zone: targetData.zoneCompound,
        index: getInsertIndex({
          position,
          sourceIndex: dragged.index,
          targetIndex: targetData.index,
          isSameZone: targetData.zoneCompound === dragged.zoneCompound,
        }),
      }
    );
  } else {
    // The row is only a target via its child zones: no line, no drop
    outlineStore.clearTarget();
  }

  const isCurrentlyExpanded =
    Boolean(state.ui.itemExpanded?.[targetData.itemId]) ||
    outlineStore.tempExpandedIds.has(targetData.itemId);

  const isExpandable = componentDataHasSlots(targetData.itemId, indexes.zones);

  // If it's not currently expanded schedule the expansion, otherwise cancel any pending one.
  if (!isCurrentlyExpanded && isExpandable) {
    outlineStore.scheduleExpand(targetData.itemId, () => {
      // The mounted subtree shifts everything below it; refresh the cached
      // collision shapes once it has painted
      requestAnimationFrame(() => manager.collisionObserver.forceUpdate(true));
    });
  } else {
    outlineStore.cancelPendingExpand();
  }
};

/**
 * Finalizes the drag operation in the outline. Moves the component if dropped on a valid target, and resets the outline dnd state.
 *
 * @param event The dnd-kit event
 * @param ctx The outline drag context
 */
export const onOutlineDragEnd = (
  event: DragEndEvent,
  ctx: OutlineDragContext
) => {
  const { source } = event.operation;
  const outlineDnDState = ctx.outlineDndStore.getState();
  const dragged = outlineDnDState.draggedRow;
  const drop = event.canceled ? null : outlineDnDState.drop;
  const dispatch = ctx.appStore.getState().dispatch;

  // Make the preview interactive again
  setPreviewFence(false);

  if (dragged && drop) {
    // Move the component and select it
    moveComponent(
      dragged.itemId,
      { zone: dragged.zoneCompound, index: dragged.index },
      { zone: drop.zone, index: drop.index },
      ctx.appStore
    );

    const moved =
      drop.zone !== dragged.zoneCompound || drop.index !== dragged.index;

    dispatch({
      type: "setUi",
      ui: {
        itemSelector: { zone: drop.zone, index: drop.index },
        isDragging: false,
      },
      recordHistory: moved,
    });

    scrollToComponentWhenSettled(dragged.itemId, ctx.scrollToComponent);
  } else {
    // Drag was canceled or dropped outside the outline: no move
    dispatch({
      type: "setUi",
      ui: { isDragging: false },
      recordHistory: false,
    });
  }

  outlineDnDState.endDrag();

  const reset = () => ctx.outlineDndStore.getState().reset();

  if (!source || source.status === "idle") {
    reset();
  } else {
    // Suppress the post-drop click (which would re-select the source row's
    // old position) by staying in "dropping" until the source settles
    const dispose = effect(() => {
      if (source.status === "idle") {
        reset();
        dispose?.();
      }
    });
  }
};
