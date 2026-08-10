import getClassNameFactory from "../../../../lib/get-class-name-factory";
import mergeClassNames from "../../../../lib/merge-class-names";
import { rootAreaId } from "../../../../lib/root-droppable-id";
import { useMessage } from "../../../../lib/use-message";

import useOutlineDropZone from "../../lib/dnd/use-outline-drop-zone";

import { DropLine } from "../drop-line";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("LayerTree", styles);

/**
 * Renders the "No items" helper. Which is also a dropzone for inserting at the start of the zone.
 */
export const EmptyZonePlaceholder = ({
  zoneCompound,
}: {
  zoneCompound: string;
}) => {
  const { ref, isDropTarget } = useOutlineDropZone({
    kind: "empty",
    zoneCompound,
  });

  const noItemsMsg = useMessage("outline-empty");
  const [parentId] = zoneCompound.split(":");
  const isRoot = parentId === rootAreaId;

  return (
    <li
      className={mergeClassNames(
        getClassName("helper"),
        isRoot ? getClassName("helperRoot") : undefined
      )}
      data-puck-drop-target={isDropTarget || undefined}
      ref={ref}
    >
      {noItemsMsg}
      {isDropTarget && <DropLine edge="top" />}
    </li>
  );
};
