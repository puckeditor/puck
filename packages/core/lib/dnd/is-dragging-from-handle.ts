import type { Draggable } from "@dnd-kit/dom";
import { isElement } from "@dnd-kit/dom/utilities";

/**
 * Util that checks whether a drag operation was started from a registered drag handle.
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
