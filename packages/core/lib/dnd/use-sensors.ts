import { useState } from "react";
import { PointerSensor } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import type { PointerSensorOptions } from "@dnd-kit/dom";
import type { ActivationConstraint } from "@dnd-kit/abstract";
import isDraggingFromHandle from "./is-dragging-from-handle";

const { Delay, Distance } = PointerActivationConstraints;

export type ActivationConstraints = ActivationConstraint<PointerEvent>[];

const touchDefault: ActivationConstraints = [
  new Delay({ value: 200, tolerance: 10 }),
];

const otherDefault: ActivationConstraints = [
  new Delay({ value: 200, tolerance: 10 }),
  new Distance({ value: 5 }),
];

type UseSensorsOptions = {
  /** Activation constraints for the mouse pointer, only used when dragging from the handle */
  mouse?: ActivationConstraints;
  /** Activation constraints for the touch pointer */
  touch?: ActivationConstraints;
  /** Activation constraints for other pointer types */
  other?: ActivationConstraints;
  /** Elements that can start a drag. Defaults to the handle, or the element. */
  activatorElements?: PointerSensorOptions["activatorElements"];
  /**
   * Fires on every pointerdown that **can start a drag** (will also fire for events that won't start a drag), before any activation
   * constraint (e.g. distance) resolves.
   *
   * dnd-kit fires events (dragstart, dragmove, beforedragstart, etc.) after resolving constraints.
   * This means that the event (and targets) received from the dnd-kit event-handlers could be different from
   * the ones that fired the pointerdown event. If using within the iframe it could also incorrectly point targets to the iframe document.
   *
   * This callback allows you to access the original pointerdown event and its target.
   */
  onPointerDown?: (event: PointerEvent) => void;
};

export const useSensors = (
  {
    other = otherDefault,
    mouse,
    touch = touchDefault,
    activatorElements,
    onPointerDown,
  }: UseSensorsOptions = {
    touch: touchDefault,
    other: otherDefault,
  }
) => {
  const [sensors] = useState(() => [
    PointerSensor.configure({
      activatorElements,
      activationConstraints(event, source) {
        onPointerDown?.(event);
        const { pointerType } = event;

        if (
          pointerType === "mouse" &&
          isDraggingFromHandle({ event, source })
        ) {
          return mouse;
        }

        if (pointerType === "touch") {
          return touch;
        }

        return other;
      },
    }),
  ]);

  return sensors;
};
