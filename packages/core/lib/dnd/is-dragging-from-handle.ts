import { Draggable } from "@dnd-kit/dom";
import { isElement } from "@dnd-kit/dom/utilities";

/**
 * Util that checks whether a drag operation was started from a registered drag handle.
 *
 * NB: If the handle unmounts before the drag starts, you should use this in the `onBeforeDragStart` callback to check and track the source handle.
 *
 * @param operation The drag event and source.
 * @returns True if the drag was started from a registered drag handle, false otherwise.
 */
const isDraggingFromHandle = (operation: {
  event: Event | null;
  source: Draggable | null;
}) => {
  const { event: activatorEvent, source } = operation;
  const target = activatorEvent?.target ?? null;

  return Boolean(
    source?.handle && isElement(target) && source.handle.contains(target)
  );
};

export default isDraggingFromHandle;
