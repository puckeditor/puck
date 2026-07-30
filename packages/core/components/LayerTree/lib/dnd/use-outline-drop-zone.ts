import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/react";
import { pointerIntersection } from "@dnd-kit/collision";

import { useAppStoreApi } from "../../../../store";

import {
  createOutlineAccept,
  OUTLINE_ZONE_TYPE,
  OutlineZoneDndData,
} from "../../lib/dnd/compute";
import { useOutlineDndStore, useOutlineDndStoreApi } from "../../lib/store";

export interface UseOutlineDropZoneProps {
  /** The kind of dropzone, either "label" or "empty". */
  kind: "label" | "empty";
  /** The compound identifier of the dropzone ({componentId}:{zone/slot name}). */
  zoneCompound: string;
}

export interface UseOutlineDropZoneResult {
  /** Ref to attach to the dropzone element. Registers it as a drop target. */
  ref: (element: Element | null) => void;
  /** Whether the dropzone is currently the target of a drag operation. */
  isDropTarget: boolean;
}

/**
 * A hook to manage the drag-and-drop state of an outline dropzone. It returns refs and flags to be used in the dropzone's component.
 *
 * @returns The ref to attach to the dropzone element, and flags indicating drag state.
 */
const useOutlineDropZone = ({
  kind,
  zoneCompound,
}: UseOutlineDropZoneProps): UseOutlineDropZoneResult => {
  const appStore = useAppStoreApi();
  const outlineStore = useOutlineDndStoreApi();

  const dndId = `${kind}:${zoneCompound}`;

  const accept = useMemo(
    () =>
      createOutlineAccept(
        { appStore, outlineStore },
        {
          kind: "zone",
          zoneCompound,
        }
      ),
    [appStore, outlineStore, zoneCompound]
  );

  const { ref } = useDroppable<OutlineZoneDndData>({
    id: dndId,
    type: OUTLINE_ZONE_TYPE,
    accept,
    collisionDetector: pointerIntersection,
    data: { kind: "zone", zoneCompound },
  });

  const isDropTarget = useOutlineDndStore(
    (s) => s.indicator?.targetId === dndId
  );

  const outlineDropZoneObject = useMemo(
    () => ({ isDropTarget, ref }),
    [isDropTarget, ref]
  );

  return outlineDropZoneObject;
};

export default useOutlineDropZone;
