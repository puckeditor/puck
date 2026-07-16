import getClassNameFactory from "../../lib/get-class-name-factory";
import { useAppStore } from "../../store";

import { LayerTreeZone } from "./components/layer-tree-zone";
import { OutlineDndProvider } from "./components/outline-dnd-provider";
import type { LayerZone } from "./types";

import styles from "./styles.module.css";

export { buildLayerTree } from "./lib/build-layer-tree";

const getClassNameDragRoot = getClassNameFactory("LayerTreeRoot", styles);

/**
 * Renders a draggable outline for the provided trees
 */
export const LayerTree = ({
  selectedId,
  trees,
}: {
  selectedId: string | null;
  trees: LayerZone[];
}) => {
  const disableOutlineDrag = useAppStore(
    (s) => s.dnd?.disableOutlineDrag ?? false
  );

  const hasItems = trees.length > 0 && trees[0].items.length > 0;

  return (
    <OutlineDndProvider>
      <div
        className={getClassNameDragRoot()}
        data-puck-dnd-disabled={disableOutlineDrag || undefined}
      >
        {hasItems &&
          trees.map((tree) => (
            <LayerTreeZone
              depth={0}
              key={tree.zoneCompound}
              selectedId={selectedId}
              tree={tree}
            />
          ))}
      </div>
    </OutlineDndProvider>
  );
};
