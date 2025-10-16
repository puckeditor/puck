"use client";
import { Editor } from "../../../components/RichTextEditor";
import { Render } from "../../../components/RichTextEditor/Render";
import { FieldTransforms } from "../../../types/API/FieldTransforms";
import { useAppStoreApi } from "../../../store";
import { setDeep } from "../../../lib/data/set-deep";
import { registerOverlayPortal } from "../../../lib/overlay-portal";
import { useEffect, useRef, useCallback, memo, MouseEvent } from "react";
import { Extensions, JSONContent } from "@tiptap/react";
import {
  RichTextControls,
  RichTextMenuConfig,
  RichTextSelectOptions,
  RichTextSelector,
} from "../../../components/RichTextEditor/types";
import { getSelectorForId } from "../../get-selector-for-id";

const InlineEditorWrapper = memo(
  ({
    value,
    componentId,
    propPath,
    menu,
    textSelectOptions,
    selector,
    controls,
    extensions,
  }: {
    value: string;
    componentId: string;
    propPath: string;
    menu?: RichTextMenuConfig;
    textSelectOptions?: RichTextSelectOptions[];
    selector?: RichTextSelector;
    controls?: RichTextControls;
    extensions?: Extensions;
  }) => {
    const portalRef = useRef<HTMLDivElement>(null);
    const appStoreApi = useAppStoreApi();

    const onClickHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const itemSelector = getSelectorForId(
        appStoreApi.getState().state,
        componentId
      );

      appStoreApi.getState().setUi({ itemSelector });
    };

    // Register portal once
    useEffect(() => {
      if (!portalRef.current) return;
      const cleanup = registerOverlayPortal(portalRef.current);
      return () => cleanup?.();
    }, [portalRef.current]);

    const handleChange = useCallback(
      async (content: string | JSONContent) => {
        const appStore = appStoreApi.getState();
        const node = appStore.state.indexes.nodes[componentId];
        const zoneCompound = `${node.parentId}:${node.zone}`;
        const index =
          appStore.state.indexes.zones[zoneCompound]?.contentIds.indexOf(
            componentId
          );

        const newProps = setDeep(node.data.props, propPath, content);

        const resolvedData = await appStore.resolveComponentData(
          { ...node.data, props: newProps },
          "replace"
        );

        appStore.dispatch({
          type: "replace",
          data: resolvedData.node,
          destinationIndex: index,
          destinationZone: zoneCompound,
        });
      },
      [appStoreApi, componentId, propPath]
    );

    return (
      <div ref={portalRef} onClick={onClickHandler}>
        <Editor
          content={value}
          id={componentId}
          onChange={handleChange}
          extensions={extensions}
          menu={menu}
          textSelectOptions={textSelectOptions}
          selector={selector}
          controls={controls}
          inline
        />
      </div>
    );
  }
);

InlineEditorWrapper.displayName = "InlineEditorWrapper";

export const getRichTextTransform = (): FieldTransforms => ({
  richtext: ({ value, componentId, field, propPath, isReadOnly }) => {
    const {
      contentEditable = true,
      inlineMenu,
      textSelectOptions,
      selector,
      controls,
      extensions,
    } = field;
    if (contentEditable === false || isReadOnly) {
      return <Render content={value} extensions={extensions} />;
    }

    return (
      <InlineEditorWrapper
        key={componentId}
        value={value}
        componentId={componentId}
        propPath={propPath}
        menu={inlineMenu}
        textSelectOptions={textSelectOptions}
        selector={selector}
        controls={controls}
        extensions={extensions}
      />
    );
  },
});
