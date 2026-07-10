import { Layers } from "lucide-react";
import styles from "../styles.module.css";
import getClassNameFactory from "../../../lib/get-class-name-factory";
import { LayerZone } from "../types";
import { StaticLayerTreeItems } from "./static-layer-tree-items";
import { VirtualizedLayerTreeItems } from "./virtualized-layer-tree-items";
import useOutlineDropZone from "../lib/dnd/use-outline-drop-zone";

const getClassName = getClassNameFactory("LayerTree", styles);

const MIN_VIRTUALIZED_LAYER_COUNT = 25;

/** Renders the name of the zone, which is also a dropzone */
const ZoneLabel = ({
  label,
  zoneCompound,
}: {
  label: string;
  zoneCompound: string;
}) => {
  const { ref, isDropTarget } = useOutlineDropZone({
    kind: "label",
    zoneCompound,
  });

  return (
    <div
      className={getClassName("zoneTitle")}
      data-puck-drop-target={isDropTarget || undefined}
      ref={ref}
    >
      <div className={getClassName("zoneIcon")}>
        <Layers />
      </div>
      {label}
    </div>
  );
};

/**
 * Renders one zone of the tree: its label followed by its rows.
 */
export const LayerTreeZone = ({
  depth,
  selectedId,
  tree,
}: {
  depth: number;
  selectedId: string | null;
  tree: LayerZone;
}) => {
  // Only large root-level zones virtualize nested zones stay static because their
  // row counts are bounded by their parent.
  const shouldVirtualize =
    depth === 0 && tree.items.length >= MIN_VIRTUALIZED_LAYER_COUNT;

  return (
    <>
      {tree.label && (
        <ZoneLabel label={tree.label} zoneCompound={tree.zoneCompound} />
      )}
      {shouldVirtualize ? (
        <VirtualizedLayerTreeItems
          depth={depth}
          selectedId={selectedId}
          tree={tree}
        />
      ) : (
        <StaticLayerTreeItems
          depth={depth}
          selectedId={selectedId}
          tree={tree}
        />
      )}
    </>
  );
};
