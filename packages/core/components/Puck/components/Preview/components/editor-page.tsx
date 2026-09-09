import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAppStore } from "../../../../../store";
import { toComponent } from "../../../../../lib/data/to-component";
import { getSlotTransform } from "../../../../../lib/field-transforms/default-transforms/slot-transform";
import { useFieldTransformsTracked } from "../../../../../lib/field-transforms/use-field-transforms-tracked";
import { expandNode } from "../../../../../lib/data/flatten-node";
import { rootDroppableId } from "../../../../../lib/root-droppable-id";
import {
  ComponentData,
  DefaultRootRenderProps,
  RootData,
} from "../../../../../types";

import { useRichtextProps } from "../../../../RichTextEditor/lib/use-richtext-props";
import { DropZoneEditPure, DropZonePure } from "../../../../DropZone";

const slotFieldTransforms = getSlotTransform(DropZoneEditPure);

/**
 * Renders the puck data in the editor where this component is rendered as an editable page.
 */
const EditorPage = memo(() => {
  // All the props, slot props are defaulted to null
  const flatRootProps = useAppStore(
    useShallow((s) => s.state.indexes.nodes.root?.flatData.props)
  );
  const config = useAppStore((s) => s.config);
  const metadata = useAppStore((s) => s.metadata);

  // Root as object with slots still defaulted to null
  const rootAsComponent = useMemo(() => {
    const rootAsComponent = toComponent({
      props: flatRootProps ?? {},
    } as RootData);

    return expandNode(rootAsComponent) as ComponentData;
  }, [flatRootProps]);

  // Get the props with stable slot render functions
  // (tracked only sees `null` for slot props across calls, so prev always === next)
  const propsWithSlots = useFieldTransformsTracked(
    config,
    rootAsComponent,
    slotFieldTransforms
  );

  // Build the final props to be passed to the user provided root render
  const renderProps: DefaultRootRenderProps = useMemo(() => {
    return {
      ...propsWithSlots,
      children: <DropZonePure zone={rootDroppableId} />,
      puck: {
        renderDropZone: DropZonePure,
        isEditing: true,
        dragRef: null,
        metadata,
      },
      editMode: true, // DEPRECATED
    };
  }, [propsWithSlots, metadata]);

  // Get the richtext props for the root render
  const richtextProps = useRichtextProps(
    config.root?.fields ?? {},
    renderProps
  );

  return config.root?.render ? (
    config.root?.render({
      ...renderProps,
      ...richtextProps,
      id: "puck-root",
    })
  ) : (
    <>{renderProps.children}</>
  );
});

EditorPage.displayName = "EditorPage";

export default EditorPage;
