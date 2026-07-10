import getClassNameFactory from "../../../lib/get-class-name-factory";

import useOutlineDropZone from "../lib/dnd/use-outline-drop-zone";
import styles from "../styles.module.css";

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

  return (
    <li
      className={getClassName("helper")}
      data-puck-drop-target={isDropTarget || undefined}
      ref={ref}
    >
      No items
    </li>
  );
};
