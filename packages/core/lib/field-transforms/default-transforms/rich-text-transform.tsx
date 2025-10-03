"use client";
import { InlineEditor } from "../../../components/RichTextEditor";
import { Render } from "../../../components/RichTextEditor/Render";
import { FieldTransforms } from "../../../types/API/FieldTransforms";
import { useAppStoreApi } from "../../../store";
import { setDeep } from "../../../lib/data/set-deep";
import { registerOverlayPortal } from "../../../lib/overlay-portal";
import { useEffect, useRef, useCallback, memo } from "react";
import { Extensions, JSONContent } from "@tiptap/react";
import { RichTextConfigType } from "../../../types";

const InlineEditorWrapper = memo(
  ({
    value,
    componentId,
    propPath,
    extensionOverrides,
    configOverrides,
  }: {
    value: string;
    componentId: string;
    propPath: string;
    extensionOverrides?: Extensions[];
    configOverrides?: Partial<RichTextConfigType>;
  }) => {
    const portalRef = useRef<HTMLDivElement>(null);
    const appStoreApi = useAppStoreApi();

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
      <div ref={portalRef}>
        <InlineEditor
          content={value}
          id={componentId}
          onChange={handleChange}
          extensionOverrides={extensionOverrides}
          configOverrides={configOverrides}
        />
      </div>
    );
  }
);

InlineEditorWrapper.displayName = "InlineEditorWrapper";

export const getRichTextTransform = (): FieldTransforms => ({
  richtext: ({ value, componentId, field, propPath, isReadOnly }) => {
    const { contentEditable, config, extensions } = field;

    if (contentEditable === false || isReadOnly) {
      return <Render content={value} />;
    }

    return (
      <InlineEditorWrapper
        key={componentId}
        value={value}
        componentId={componentId}
        extensionOverrides={extensions || []}
        configOverrides={config}
        propPath={propPath}
      />
    );
  },
});
