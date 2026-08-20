import type { ReactNode } from "react";
import { Tabs } from "nextra/components";

const FRAMEWORK_STORAGE_KEY = "puck-docs-framework";

export function FrameworkTabs({ children }: { children: ReactNode }) {
  return (
    <Tabs items={["React", "Vue", "Svelte"]} storageKey={FRAMEWORK_STORAGE_KEY}>
      {children}
    </Tabs>
  );
}

export const FrameworkTab = Tabs.Tab;
