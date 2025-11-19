"use client";
import { Editor } from "../../../components/RichTextEditor";
import { Render } from "../../../components/RichTextEditor/Render";
import { FieldTransforms } from "../../../types/API/FieldTransforms";
import { useAppStoreApi } from "../../../store";
import { setDeep } from "../../../lib/data/set-deep";
import { registerOverlayPortal } from "../../../lib/overlay-portal";
import {
  useEffect,
  useRef,
  useCallback,
  memo,
  MouseEvent,
  FocusEvent,
} from "react";
import { Editor as TipTapEditor, JSONContent } from "@tiptap/react";
import { getSelectorForId } from "../../get-selector-for-id";
import { RichtextField } from "../../../types";

const InlineEditorWrapper = memo(
  ({
    value,
    componentId,
    propPath,
    field,
  }: {
    value: string;
    componentId: string;
    propPath: string;
    field: RichtextField;
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
      const cleanup = registerOverlayPortal(portalRef.current, {
        disableDragOnFocus: true,
      });
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

    const handleFocus = useCallback(
      (editor: TipTapEditor) => {
        appStoreApi.setState({
          currentRichText: {
            inlineComponentId: componentId,
            field,
            editor,
          },
        });
      },
      [field, componentId]
    );

    const handleBlur = useCallback((e: FocusEvent) => {
      const targetInMenu =
        e.relatedTarget?.parentElement?.hasAttribute("data-rte-menu");

      if (!targetInMenu) {
        appStoreApi.setState({
          currentRichText: null,
        });
      }
    }, []);

    return (
      <div ref={portalRef} onClick={onClickHandler} onBlur={handleBlur}>
        <Editor
          content={value}
          onChange={handleChange}
          field={field}
          inline
          onFocus={handleFocus}
        />
      </div>
    );
  }
);

InlineEditorWrapper.displayName = "InlineEditorWrapper";

export const getRichTextTransform = (): FieldTransforms => ({
  richtext: ({ value, componentId, field, propPath, isReadOnly }) => {
    const { contentEditable = true, extensions } = field;
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
        field={field}
      />
    );
  },
});
