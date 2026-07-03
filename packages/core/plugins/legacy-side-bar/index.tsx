import { Plugin } from "../../types";
import { Components } from "../../components/Puck/components/Components";
import { Outline } from "../../components/Puck/components/Outline";
import { SidebarSection } from "../../components/SidebarSection";
import { useMessage } from "../../lib/use-message";

const LegacySideBar = ({
  outlineLabel,
  componentsLabel,
}: {
  outlineLabel?: string;
  componentsLabel?: string;
}) => {
  const componentsLabelMessage = useMessage("plugin-components");
  const outlineLabelMessage = useMessage("plugin-outline");

  const resolvedComponentsLabel = componentsLabel ?? componentsLabelMessage;
  const resolvedOutlineLabel = outlineLabel ?? outlineLabelMessage;

  return (
    <div style={{ overflowY: "auto" }}>
      <SidebarSection title={resolvedComponentsLabel} noBorderTop>
        <Components />
      </SidebarSection>
      <SidebarSection title={resolvedOutlineLabel}>
        <Outline />
      </SidebarSection>
    </div>
  );
};

export const legacySideBarPlugin: (props?: {
  outlineLabel?: string;
  componentsLabel?: string;
}) => Plugin = (props = {}) => ({
  name: "legacy-side-bar",
  render: () => (
    <LegacySideBar
      outlineLabel={props.outlineLabel}
      componentsLabel={props.componentsLabel}
    />
  ),
});
