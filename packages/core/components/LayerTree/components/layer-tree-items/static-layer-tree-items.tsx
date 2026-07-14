import getClassNameFactory from "../../../../lib/get-class-name-factory";

import { LayerZone } from "../../types";

import { EmptyZonePlaceholder } from "../empty-zone-placeholder";
import { Layer } from "../layer";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("LayerTree", styles);

/** Renders all of a zone's items and their children recursively */
export const StaticLayerTreeItems = ({
  depth,
  selectedId,
  tree,
}: {
  depth: number;
  selectedId: string | null;
  tree: LayerZone;
}) => {
  return (
    <ul className={getClassName({ nested: depth > 0 })}>
      {tree.items.length === 0 && (
        <EmptyZonePlaceholder zoneCompound={tree.zoneCompound} />
      )}
      {tree.items.map((node) => (
        <Layer
          depth={depth}
          isSelected={selectedId === node.itemId}
          key={node.itemId}
          node={node}
          selectedId={selectedId}
        />
      ))}
    </ul>
  );
};
