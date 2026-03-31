import { buildLayerTree, LayerTree } from "../../../LayerTree";
import { useAppStore } from "../../../../store";
import { useMemo } from "react";
import { findZonesForArea } from "../../../../lib/data/find-zones-for-area";
import { useShallow } from "zustand/react/shallow";

export const Outline = () => {
  const outlineOverride = useAppStore((s) => s.overrides.outline);
  const config = useAppStore((s) => s.config);
  const nodes = useAppStore((s) => s.state.indexes.nodes);
  const zones = useAppStore((s) => s.state.indexes.zones);
  const selectedId = useAppStore((s) => s.selectedItem?.props.id || null);

  const rootZones = useAppStore(
    useShallow((s) => findZonesForArea(s.state, "root"))
  );

  const selectedPathIds = useMemo(() => {
    const selectedPath = selectedId ? nodes[selectedId]?.path : null;

    return new Set(
      selectedPath
        ?.map((candidate) => candidate.split(":")[0])
        .filter(Boolean) || []
    );
  }, [nodes, selectedId]);

  const trees = useMemo(
    () =>
      rootZones.map((zoneCompound) =>
        buildLayerTree({
          config,
          label: rootZones.length === 1 ? "" : zoneCompound.split(":")[1],
          nodes,
          zoneCompound,
          zones,
        })
      ),
    [config, nodes, rootZones, zones]
  );

  const Wrapper = useMemo(() => outlineOverride || "div", [outlineOverride]);

  return (
    <Wrapper>
      <LayerTree
        selectedId={selectedId}
        selectedPathIds={selectedPathIds}
        trees={trees}
      />
    </Wrapper>
  );
};
