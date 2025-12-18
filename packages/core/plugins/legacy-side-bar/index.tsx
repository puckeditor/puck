import { PluginInternal } from "../../types/Internal";
import { Components } from "../../components/Puck/components/Components";
import { Outline } from "../../components/Puck/components/Outline";
import { SidebarSection } from "../../components/SidebarSection";

export const legacySideBarPlugin: () => PluginInternal = () => ({
  __name: "legacy-side-bar",
  render: () => (
    <div style={{ overflowY: "auto" }}>
      <SidebarSection title="Components" noBorderTop>
        <Components />
      </SidebarSection>
      <SidebarSection title="Outline">
        <Outline />
      </SidebarSection>
    </div>
  ),
});
