import { LayerTree } from "../../../LayerTree";
import { useAppStore } from "../../../../store";
import { useMemo } from "react";
import { rootDroppableId } from "../../../../lib/root-droppable-id";

export const Outline = () => {
  const outlineOverride = useAppStore((s) => s.overrides.outline);

  const Wrapper = useMemo(() => outlineOverride || "div", [outlineOverride]);
  
  // Use a SINGLE LayerTree for all zones - this allows cross-zone drops
  return (
    <Wrapper>
      <LayerTree zoneCompound={rootDroppableId} />
    </Wrapper>
  );
};
