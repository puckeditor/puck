import { useEffect, ReactNode, useRef } from "react";
import { MenuBar } from "../MenuBar";
import { RichTextMenuItem, RichTextSelector } from "../../types";
import { ActionBar } from "../../../ActionBar";
import { useAppStoreApi } from "../../../../store";
import { useActiveEditor } from "../../context";

export function InlineMenu({
  menuConfig,
  selector,
  id,
}: {
  menuConfig: Record<string, Record<string, RichTextMenuItem>>;
  selector?: RichTextSelector;
  id?: string;
}) {
  const appStoreApi = useAppStoreApi();
  const { activeEditor: editor, currentInlineId } = useActiveEditor();

  const defaultOverrides = useRef(appStoreApi.getState().overrides);
  const previous = defaultOverrides.current?.actionBar;

  useEffect(() => {
    if (currentInlineId === null) {
      appStoreApi.setState((s) => ({
        overrides: {
          ...defaultOverrides.current,
        },
      }));
      return;
    }

    const customActionBar = ({
      children,
      label,
      parentAction,
    }: {
      label?: string;
      children: ReactNode;
      parentAction: ReactNode;
    }) => (
      <ActionBar label={label}>
        <ActionBar.Group>
          <MenuBar
            menuConfig={menuConfig}
            editor={editor}
            selector={selector}
            inline
          />
        </ActionBar.Group>
        {previous ? (
          <ActionBar.Group>
            {previous({
              label: "",
              children: null,
              parentAction,
            })}
          </ActionBar.Group>
        ) : null}
        <ActionBar.Group>{children}</ActionBar.Group>
      </ActionBar>
    );

    appStoreApi.setState((s) => ({
      overrides: {
        ...s.overrides,
        actionBar: customActionBar,
      },
    }));

    // If some *other* id is active, this instance does nothing
  }, [currentInlineId, id, editor, menuConfig, selector, appStoreApi]);

  return null;
}
