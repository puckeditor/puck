import { useCallback, useContext, useMemo } from "react";
import { Feedback } from "@dnd-kit/dom";
import { useSortable } from "@dnd-kit/react/sortable";

import { createDynamicCollisionDetector } from "../../../../lib/dnd/collision/dynamic";
import { useAppStoreApi } from "../../../../store";

import {
  createOutlineAccept,
  OUTLINE_ITEM_TYPE,
  OutlineRowDndData,
} from "./compute";
import {
  useOutlineDndStoreApi,
  useOutlineDndStore,
  OutlineIndicator,
} from "../store";

export interface UseOutlineRowDndProps {
  /** The type of the component being dragged (from ComponentData). */
  componentType: string;
  /** The unique identifier of the row's component data (from props). */
  itemId: string;
  /** The index of the row within its zone. */
  index: number;
  /** The compound identifier of the zone containing the row ({componentId}:{zoneId}). */
  zoneCompound: string;
}

export interface UseOutlineRowDndResult {
  /** Ref to attach to the row element. Registers it as a drag source, target, and handle. */
  rowRef: (element: Element | null) => void;
  /** Whether the row is the source of a drag operation. Doesn't deactivate until the item is added to the drop target. */
  isDragSource: boolean;
  /** The position of the drop indicator relative to this row when dragging another row on top of it. */
  indicatorPosition: OutlineIndicator["position"] | null;
  /** Whether this row is a candidate for expansion during a drag operation. */
  isExpandCandidate: boolean;
  /** Whether this row is temporarily expanded during a drag operation. */
  isTempExpanded: boolean;
}

/**
 * A hook to manage the drag-and-drop state of a single outline row. It returns refs and flags to be used in the row's component.
 *
 * @returns The ref to attach to the row element, flags indicating drag state, and the position of the drop indicator.
 */
export const useOutlineRowDnd = ({
  componentType,
  index,
  itemId,
  zoneCompound,
}: UseOutlineRowDndProps): UseOutlineRowDndResult => {
  const appStore = useAppStoreApi();
  const outlineStore = useOutlineDndStoreApi();

  const accept = useMemo(
    () =>
      createOutlineAccept(
        { appStore, outlineStore },
        { kind: "row", itemId, zoneCompound }
      ),
    [appStore, outlineStore, itemId, zoneCompound]
  );

  const collisionDetector = useMemo(
    () => createDynamicCollisionDetector("y"),
    []
  );

  const { handleRef, ref, isDragSource } = useSortable<OutlineRowDndData>({
    id: itemId,
    index,
    group: zoneCompound,
    type: OUTLINE_ITEM_TYPE,
    accept,
    data: {
      kind: "row",
      itemId,
      zoneCompound,
      index,
      componentType,
    },
    collisionPriority: 1,
    collisionDetector,
    // Don't animate rows while dragging or dropping
    transition: { duration: 0 },
    plugins: (defaults) => [
      ...defaults,
      // The source row stays rendered in place
      // The drop animation is disabled for a more snappy feel
      Feedback.configure({ feedback: "clone", dropAnimation: null }),
    ],
  });

  const { indicatorPosition, isExpandCandidate, isTempExpanded } =
    useOutlineDndStore((s) => ({
      indicatorPosition:
        s.indicator?.targetId === itemId ? s.indicator.position : null,
      isExpandCandidate: s.expandCandidateId === itemId,
      isTempExpanded: s.tempExpandedIds.has(itemId),
    }));

  // Rows are full of buttons (select, caret, actions),
  // and dnd-kit refuses to start drags from interactive elements unless
  // they sit inside the source's handle.
  const rowRef = useCallback(
    (element: Element | null) => {
      ref(element);
      handleRef(element);
    },
    [ref, handleRef]
  );

  return {
    rowRef,
    isDragSource,
    indicatorPosition,
    isExpandCandidate,
    isTempExpanded,
  };
};
