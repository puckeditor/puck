import { useEffect, ReactNode } from "react";
import { MenuBar } from "../MenuBar";
import {
  RichTextEditor,
  RichTextMenuItem,
  RichTextSelector,
} from "../../types";
import { ActionBar } from "../../../ActionBar";

import { useAppStore, useAppStoreApi } from "../../../../store";

export function DynamicActions({
  menuConfig,
  editor,
  selector,
}: {
  menuConfig: Record<string, Record<string, RichTextMenuItem>>;
  editor: RichTextEditor | null;
  selector?: RichTextSelector;
}) {
  const appStoreApi = useAppStoreApi();
  const selectedItem = useAppStore((s) => s.selectedItem);

  useEffect(() => {
    if (!selectedItem) return;

    const state = appStoreApi.getState();
    const component = state.config.components[selectedItem.type];
    const fields = component?.fields ?? {};
    const hasRichText = Object.values(fields).some(
      (f: any) => f?.type === "richtext"
    );

    if (!hasRichText) return;

    const customActionBar = ({
      children,
      label,
      parentAction: _,
    }: {
      label?: string;
      children: ReactNode;
      parentAction: ReactNode;
    }) => (
      <ActionBar label={label}>
        <MenuBar
          menuConfig={menuConfig}
          editor={editor}
          selector={selector}
          inline
        />
        {children}
      </ActionBar>
    );

    appStoreApi.setState((s) => ({
      overrides: {
        ...s.overrides,
        actionBar: customActionBar,
      },
    }));
  }, [appStoreApi, selectedItem]);

  return null;
}
