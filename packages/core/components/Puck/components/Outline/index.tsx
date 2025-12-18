import { LayerTree } from "../../../LayerTree";
import { useAppStore } from "../../../../store";
import { useMemo } from "react";
import { findZonesForArea } from "../../../../lib/data/find-zones-for-area";
import { useShallow } from "zustand/react/shallow";

export const Outline = () => {
  const outlineOverride = useAppStore((s) => s.overrides.outline);

  const rootZones = useAppStore(
    useShallow((s) => findZonesForArea(s.state, "root"))
  );

  const Wrapper = useMemo(() => outlineOverride || "div", [outlineOverride]);
  return (
    <Wrapper>
      {rootZones.map((zoneCompound) => (
        <LayerTree
          key={zoneCompound}
          label={rootZones.length === 1 ? "" : zoneCompound.split(":")[1]}
          zoneCompound={zoneCompound}
        />
      ))}
    </Wrapper>
  );
};
