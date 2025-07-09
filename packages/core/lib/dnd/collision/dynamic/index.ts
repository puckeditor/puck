import {
  Collision,
  CollisionDetector,
  CollisionPriority,
  CollisionType,
  UniqueIdentifier,
} from "@dnd-kit/abstract";
import { directionalCollision } from "../directional";
import { getDirection } from "./get-direction";
import { getMidpointImpact } from "./get-midpoint-impact";
import { trackMovementInterval } from "./track-movement-interval";
import { collisionDebug } from "../collision-debug";
import { closestCorners } from "@dnd-kit/collision";
import { DragAxis, Direction } from "../../../../types";
import { collisionStore } from "./store";

let flushNext: UniqueIdentifier = "";

/**
 * A factory for creating a "dynamic" collision detector
 *
 * A dynamic collision combines mid-point and directional collisions for smooth, flicker-free dragging with complex
 * layouts.
 *
 * Midpoint-based detection creates a natural snapping effect, inspired by react-beautiful-dnd. Each collision is
 * provided with the direction of movement, so the user can determine the appropriate place to inject the item based
 * on their layout or document direction.
 *
 * If a draggable is being dragged towards a droppable with the same ID, this is deemed the highest priority collision
 * to prevent flickering with complex layout shifts during drag.
 *
 * @param dragAxis Restrict mid-point detection to a given axis, providing a traditional sortable list detection.
 * @param midpointOffset A percentage offset from the midpoint. Defaults to 5% (0.05) from the mid-point in the
 * direction of travel, helping to create "dead zone" in the center of the item.
 *
 * @returns
 */
export const createDynamicCollisionDetector = (
  dragAxis: DragAxis,
  midpointOffset: number = 0.05
) =>
  ((input) => {
    const { dragOperation, droppable } = input;

    const { position } = dragOperation;
    const dragShape = dragOperation.shape?.current;
    const { shape: dropShape } = droppable;

    if (!dragShape || !dropShape) {
      return null;
    }

    const { center: dragCenter } = dragShape;

    const { fallbackEnabled } = collisionStore.getState();

    const interval = trackMovementInterval(position.current, dragAxis);

    const data = {
      direction: interval.direction,
    };

    const { center: dropCenter } = dropShape;

    const overMidpoint = getMidpointImpact(
      dragShape,
      dropShape,
      interval.direction,
      midpointOffset
    );

    if (dragOperation.source?.id === droppable.id) {
      // If the droppable and draggable are the same item, we check if we're moving towards the droppable.
      // If we are, we always return that as the highest priority collision target to prevent unexpected
      // movement in complex grid layouts

      const collision = directionalCollision(input, interval.previous);

      collisionDebug(dragCenter, dropCenter, droppable.id.toString(), "yellow");

      if (collision) {
        return {
          ...collision,
          priority: CollisionPriority.Highest,
          data,
        };
      }
    }

    const intersectionArea = dragShape.intersectionArea(dropShape);
    const intersectionRatio = intersectionArea / dropShape.area;

    if (intersectionArea && overMidpoint) {
      collisionDebug(
        dragCenter,
        dropCenter,
        droppable.id.toString(),
        "green",
        interval.direction
      );

      const collision: Collision = {
        id: droppable.id,
        value: intersectionRatio,
        priority: CollisionPriority.High,
        type: CollisionType.Collision,
      };

      // HACK: Flush ID if it's already in use by temporarily setting the id to something invalid. This forces dnd-kit to trigger a new dragmove event.
      const shouldFlushId = flushNext === droppable.id;

      flushNext = "";

      return { ...collision, id: shouldFlushId ? "flush" : collision.id, data };
    }

    if (fallbackEnabled && dragOperation.source?.id !== droppable.id) {
      // Only calculate fallbacks when the draggable sits within the droppable's axis projection
      const xAxisIntersection =
        dropShape.boundingRectangle.right > dragShape.boundingRectangle.left &&
        dropShape.boundingRectangle.left < dragShape.boundingRectangle.right;

      const yAxisIntersection =
        dropShape.boundingRectangle.bottom > dragShape.boundingRectangle.top &&
        dropShape.boundingRectangle.top < dragShape.boundingRectangle.bottom;

      // If drag axis is Y, then lock to x-axis (vertical) intersect. Otherwise lock to y-axis (horizontal) intersect.
      if ((dragAxis === "y" && xAxisIntersection) || yAxisIntersection) {
        const fallbackCollision = closestCorners(input);

        if (fallbackCollision) {
          // For fallback collisions, we use a direction determined by the center points of the two items
          const direction = getDirection(dragAxis, {
            x: dragShape.center.x - (droppable.shape?.center.x || 0),
            y: dragShape.center.y - (droppable.shape?.center.y || 0),
          });

          data.direction = direction;

          // Fallback collision exists for an intersecting item
          // In this scenario, we trigger a "void" fallback transaction,
          // which is prioritised over other fallback transactions
          // Because dnd-kit won't trigger a dragmove event unless the
          // target ID changes, we introduce an ID "flushing" hack
          if (intersectionArea) {
            collisionDebug(
              dragCenter,
              dropCenter,
              droppable.id.toString(),
              "red",
              direction || ""
            );

            // HACK: We always flush the ID after this collision to ensure dnd-kit triggers onDragMove
            flushNext = droppable.id;

            return {
              ...fallbackCollision,
              priority: CollisionPriority.Low,
              data,
            };
          }

          collisionDebug(
            dragCenter,
            dropCenter,
            droppable.id.toString(),
            "orange",
            direction || ""
          );

          return {
            ...fallbackCollision,
            priority: CollisionPriority.Lowest,
            data,
          };
        }
      }
    }

    collisionDebug(dragCenter, dropCenter, droppable.id.toString(), "hotpink");

    return null;
  }) as CollisionDetector;
