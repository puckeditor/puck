"use client";
import { EditorFallback } from "../../../components/RichTextEditor/components/EditorFallback";
import { RichTextRenderFallback } from "../../../components/RichTextEditor/components/RenderFallback";
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
  lazy,
  Suspense,
} from "react";
import type { Editor as TipTapEditor, JSONContent } from "@tiptap/react";
import { getSelectorForId } from "../../get-selector-for-id";
import { RichtextField, UiState } from "../../../types";

const Editor = lazy(() =>
  import("../../../components/RichTextEditor/components/Editor").then((m) => ({
    default: m.Editor,
  }))
);

const RichTextRender = lazy(() =>
  import("../../../components/RichTextEditor/components/Render").then((m) => ({
    default: m.RichTextRender,
  }))
);

const InlineEditorWrapper = memo(
  ({
    value,
    componentId,
    propPath,
    field,
    id,
  }: {
    value: string;
    componentId: string;
    propPath: string;
    field: RichtextField;
    id: string;
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
      async (content: string | JSONContent, ui?: Partial<UiState>) => {
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
          ui,
        });
      },
      [appStoreApi, componentId, propPath]
    );

    const handleFocus = useCallback(
      (editor: TipTapEditor) => {
        appStoreApi.setState({
          currentRichText: {
            inlineComponentId: componentId,
            inline: true,
            field,
            editor,
            id,
          },
        });
      },
      [field, componentId]
    );

    if (!field.contentEditable)
      return (
        <Suspense fallback={<RichTextRenderFallback content={value} />}>
          <RichTextRender content={value} field={field} />
        </Suspense>
      );

    const editorProps = {
      content: value,
      onChange: handleChange,
      field: field,
      inline: true,
      onFocus: handleFocus,
      id: id,
      name: propPath,
    };

    return (
      <div ref={portalRef} onClick={onClickHandler}>
        <Suspense fallback={<EditorFallback {...editorProps} />}>
          <Editor {...editorProps} />
        </Suspense>
      </div>
    );
  }
);

InlineEditorWrapper.displayName = "InlineEditorWrapper";

export const getRichTextTransform = (): FieldTransforms => ({
  richtext: ({ value, componentId, field, propPath, isReadOnly }) => {
    const { contentEditable = true, tiptap } = field;
    if (contentEditable === false || isReadOnly) {
      return <RichTextRender content={value} field={field} />;
    }

    const id = `${componentId}_${field.type}_${propPath}`;

    return (
      <InlineEditorWrapper
        key={id}
        value={value}
        componentId={componentId}
        propPath={propPath}
        field={field}
        id={id}
      />
    );
  },
});
