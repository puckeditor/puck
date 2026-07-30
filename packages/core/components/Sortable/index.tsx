import { DragDropProvider } from "@dnd-kit/react";
import { PropsWithChildren, ReactNode } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { PointerActivationConstraints } from "@dnd-kit/dom";

import { useSensors } from "../../lib/dnd/use-sensors";
import { createDynamicCollisionDetector } from "../../lib/dnd/collision/dynamic";

import {
  getCollisionPosition,
  getInsertIndex,
} from "../../lib/dnd/get-insert-index";

import "./styles.css";

export const SortableProvider = ({
  children,
  onDragStart,
  onDragEnd,
  onMove,
}: PropsWithChildren<{
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onMove: (moveData: { source: number; target: number }) => void;
}>) => {
  const sensors = useSensors({
    mouse: [new PointerActivationConstraints.Distance({ value: 5 })],
  });

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={(event) =>
        onDragStart(event.operation.source?.id.toString() ?? "")
      }
      onDragOver={(event, manager) => {
        event.preventDefault();

        const { operation } = event;
        const { source, target } = operation;

        if (!source || !target) return;

        const sourceIndex = source.data.index;
        const targetIndex = target.data.index;

        const collisionData = manager.collisionObserver.collisions[0]?.data;

        if (sourceIndex !== targetIndex && source.id !== target.id) {
          onMove({
            source: sourceIndex,
            target: getInsertIndex({
              position: getCollisionPosition(collisionData?.direction),
              sourceIndex,
              targetIndex,
              isSameZone: true,
            }),
          });
        }
      }}
      onDragEnd={() => {
        setTimeout(() => {
          // Delay until animation finished
          onDragEnd();
        }, 250);
      }}
    >
      {children}
    </DragDropProvider>
  );
};

export const Sortable = ({
  id,
  index,
  disabled,
  children,
  type = "item",
}: {
  id: string;
  index: number;
  disabled?: boolean;
  children: (props: {
    isDragging: boolean;
    isDropping: boolean;
    ref: (element: Element | null) => void;
    handleRef: (element: Element | null) => void;
  }) => ReactNode;
  type?: string;
}) => {
  const {
    ref: sortableRef,
    isDragging,
    isDropping,
    handleRef,
  } = useSortable({
    id,
    type,
    index,
    disabled,
    data: { index },
    collisionDetector: createDynamicCollisionDetector("y"),
  });

  return children({ isDragging, isDropping, ref: sortableRef, handleRef });
};
