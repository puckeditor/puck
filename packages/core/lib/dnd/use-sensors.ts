import { useState } from "react";
import { PointerSensor } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { isElement } from "@dnd-kit/dom/utilities";
import type { ActivationConstraint } from "@dnd-kit/abstract";

const { Delay, Distance } = PointerActivationConstraints;

export type ActivationConstraints = ActivationConstraint<PointerEvent>[];

const touchDefault: ActivationConstraints = [
  new Delay({ value: 200, tolerance: 10 }),
];

const otherDefault: ActivationConstraints = [
  new Delay({ value: 200, tolerance: 10 }),
  new Distance({ value: 5 }),
];

export const useSensors = (
  {
    other = otherDefault,
    mouse,
    touch = touchDefault,
  }: {
    mouse?: ActivationConstraints;
    touch?: ActivationConstraints;
    other?: ActivationConstraints;
  } = {
    touch: touchDefault,
    other: otherDefault,
  }
) => {
  const [sensors] = useState(() => [
    PointerSensor.configure({
      activationConstraints(event, source) {
        const { pointerType, target } = event;

        if (
          pointerType === "mouse" &&
          isElement(target) &&
          (source.handle === target || source.handle?.contains(target))
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
