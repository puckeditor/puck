import { Plugin } from "../../types";
import { Components } from "../../components/Puck/components/Components";
import { Outline } from "../../components/Puck/components/Outline";
import { SidebarSection } from "../../components/SidebarSection";
import { useMessage } from "../../lib/use-message";

// A component (not an inline render fn) so the section titles can be localized
// with the `useMessage` hook.
const LegacySideBar = () => {
  const componentsLabel = useMessage("plugin-components");
  const outlineLabel = useMessage("plugin-outline");

  return (
    <div style={{ overflowY: "auto" }}>
      <SidebarSection title={componentsLabel} noBorderTop>
        <Components />
      </SidebarSection>
      <SidebarSection title={outlineLabel}>
        <Outline />
      </SidebarSection>
    </div>
  );
};

export const legacySideBarPlugin: () => Plugin = () => ({
  name: "legacy-side-bar",
  render: () => <LegacySideBar />,
});
