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
    type,
    propPath,
    menu,
    textSelectOptions,
    selector,
    controls,
    extensions,
  }: {
    value: string;
    componentId: string;
    type: string;
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
          id={`${componentId}_${type}_${propPath}`}
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
      type,
    } = field;
    if (contentEditable === false || isReadOnly) {
      return <Render content={value} extensions={extensions} />;
    }
    const id = `${componentId}_${field.type}_${propPath}-inline`;
    return (
      <InlineEditorWrapper
        key={id}
        value={value}
        componentId={componentId}
        propPath={propPath}
        type={type}
        menu={inlineMenu}
        textSelectOptions={textSelectOptions}
        selector={selector}
        controls={controls}
        extensions={extensions}
      />
    );
  },
});
