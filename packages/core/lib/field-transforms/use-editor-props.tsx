import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { DropZoneEditPure } from "../../components/DropZone";
import { ContextSlotRender } from "../../components/SlotRender";

import { useAppStore } from "../../store";

import { ComponentData, FieldTransforms } from "../../types";

import { useFieldTransformsTracked } from "./use-field-transforms-tracked";

import { getInlineTextTransform } from "./default-transforms/inline-text-transform";
import { getRichTextTransform } from "./default-transforms/rich-text-transform";
import { getSlotTransform } from "./default-transforms/slot-transform";

export type UseEditorPropsOptions = {
  component: ComponentData;
};

/**
 * Returns the transformed props for a component to use in the editor, applying all relevant field transforms and read-only state.
 * 
 * @param component The component data for which to get the editor props.
 * @returns The transformed props for the component in the editor.
 */
const useEditorProps = ({
  component,
}: UseEditorPropsOptions): ComponentData["props"] => {
  const config = useAppStore((s) => s.config);
  const plugins = useAppStore((s) => s.plugins);
  const userFieldTransforms = useAppStore((s) => s.fieldTransforms);

  const componentId = component.props.id;
  const componentIsLoading = useAppStore(
    (s) => s.componentState[componentId]?.loadingCount > 0
  );
  const componentReadOnly = useAppStore(
    useShallow((s) => s.state.indexes.nodes[componentId]?.data.readOnly)
  );

  const combinedFieldTransforms = useMemo(
    () => ({
      ...getSlotTransform(DropZoneEditPure, (slotProps) => (
        <ContextSlotRender componentId={componentId} zone={slotProps.zone} />
      )),
      ...getInlineTextTransform(),
      ...getRichTextTransform(),
      ...plugins.reduce<FieldTransforms>((acc, plugin) => {
        if (!plugin.fieldTransforms) return acc;

        Object.keys(plugin.fieldTransforms).forEach((key) => {
          acc[key as keyof typeof acc] = plugin.fieldTransforms![key];
        });

        return acc;
      }, {}),
      ...userFieldTransforms,
    }),
    [plugins, userFieldTransforms, componentId]
  );

  return useFieldTransformsTracked(
    config,
    component,
    combinedFieldTransforms,
    componentReadOnly,
    componentIsLoading
  );
};

export default useEditorProps;
