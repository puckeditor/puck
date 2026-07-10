import getClassNameFactory from "../../lib/get-class-name-factory";

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
  return (
    <OutlineDndProvider>
      <div className={getClassNameDragRoot()}>
        {trees.map((tree) => (
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
