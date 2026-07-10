import { PointerActivationConstraints } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import { PropsWithChildren, useContext, useMemo, useState } from "react";

import { useAppStoreApi } from "../../../store";
import { ZoneStoreContext } from "../../DropZone/context";

import {
  onOutlineBeforeDragStart,
  onOutlineDragEnd,
  onOutlineDragMove,
} from "../lib/dnd/handlers";
import { createOutlineDndStore, OutlineDndStoreContext } from "../lib/store";
import { useSensors } from "../../../lib/dnd/use-sensors";

/**
 * The outline DnD context provider.
 *
 * All outline sortables/draggables/droppables should go under this provider.
 */
export const OutlineDndProvider = ({ children }: PropsWithChildren) => {
  const appStore = useAppStoreApi();
  const zoneStore = useContext(ZoneStoreContext);
  const [outlineDndStore] = useState(() => createOutlineDndStore());

  // Rows act as their own drag handles, so mouse presses need a movement
  // threshold to tell clicks and drags apart
  const sensors = useSensors({
    mouse: [new PointerActivationConstraints.Distance({ value: 5 })],
  });

  const dragContext = useMemo(
    () => ({
      outlineDndStore,
      appStore,
      scrollToComponent: (id: string) =>
        zoneStore.getState().scrollToComponent(id),
    }),
    [outlineDndStore, appStore, zoneStore]
  );

  return (
    <OutlineDndStoreContext.Provider value={outlineDndStore}>
      <DragDropProvider
        sensors={sensors}
        onBeforeDragStart={(event) => {
          onOutlineBeforeDragStart(event, dragContext);
        }}
        onDragOver={(event, manager) => {
          // Stops dnd-kit's optimistic sorting plugin from reordering the
          // outline's real DOM under React and the virtualizer
          event.preventDefault();

          onOutlineDragMove(event, manager, dragContext);
        }}
        onDragMove={(event, manager) => {
          onOutlineDragMove(event, manager, dragContext);
        }}
        onDragEnd={(event) => {
          onOutlineDragEnd(event, dragContext);
        }}
      >
        {children}
      </DragDropProvider>
    </OutlineDndStoreContext.Provider>
  );
};
