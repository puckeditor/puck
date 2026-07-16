import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAppStore } from "../../../../store";
import { getClassNameFactory } from "../../../../lib";
import { findZonesForArea } from "../../../../lib/data/find-zones-for-area";
import { useMessage } from "../../../../lib/use-message";

import { buildLayerTree, LayerTree } from "../../../LayerTree";

import CollapseAll from "./components/collapse-all";
import OutlineHeader from "./components/outline-header";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("OutlineWrapper", styles);

const DefaultWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className={getClassName()}>{children}</div>
);

/**
 * Renders the outline for the Puck component, which is a tree view of the layers and zones in the application.
 */
export const Outline = () => {
  const outlineOverride = useAppStore((s) => s.overrides.outline);
  const config = useAppStore((s) => s.config);
  const nodes = useAppStore((s) => s.state.indexes.nodes);
  const zones = useAppStore((s) => s.state.indexes.zones);
  const selectedId = useAppStore((s) => s.selectedItem?.props.id || null);
  const componentFallbackLabel = useMessage("label-component");

  const rootZones = useAppStore(
    useShallow((s) => findZonesForArea(s.state, "root"))
  );

  const trees = useMemo(
    () =>
      rootZones.map((zoneCompound) =>
        buildLayerTree({
          config,
          label: rootZones.length === 1 ? "" : zoneCompound.split(":")[1],
          nodes,
          zoneCompound,
          zones,
          componentFallbackLabel,
        })
      ),
    [config, nodes, rootZones, zones, componentFallbackLabel]
  );

  const Wrapper = useMemo(
    () => outlineOverride || DefaultWrapper,
    [outlineOverride]
  );

  return (
    <Wrapper>
      <OutlineHeader>
        <CollapseAll className={getClassName("collapseAll")} />
      </OutlineHeader>
      <div className={getClassName("layers")}>
        <LayerTree selectedId={selectedId} trees={trees} />
      </div>
    </Wrapper>
  );
};
