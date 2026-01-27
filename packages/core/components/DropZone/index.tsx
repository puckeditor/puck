import {
  forwardRef,
  memo,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { DraggableComponent } from "../DraggableComponent";
import { setupZone } from "../../lib/data/setup-zone";
import { rootDroppableId } from "../../lib/root-droppable-id";
import { getClassNameFactory } from "../../lib";
import styles from "./styles.module.css";
import {
  DropZoneContext,
  DropZoneProvider,
  ZoneStoreContext,
  dropZoneContext,
} from "./context";
import { useAppStore, useAppStoreApi } from "../../store";
import { DropZoneProps } from "./types";
import {
  ComponentData,
  Config,
  DragAxis,
  Metadata,
  Overrides,
  PuckContext,
  WithPuckProps,
} from "../../types";

import { useDroppable, UseDroppableInput } from "@dnd-kit/react";
import { DrawerItemInner } from "../Drawer";
import { pointerIntersection } from "@dnd-kit/collision";
import { UniqueIdentifier } from "@dnd-kit/abstract";
import { useMinEmptyHeight } from "./lib/use-min-empty-height";
import { assignRefs } from "../../lib/assign-refs";
import { useContentIdsWithPreview } from "./lib/use-content-with-preview";
import { useDragAxis } from "./lib/use-drag-axis";
import { useContextStore } from "../../lib/use-context-store";
import { useShallow } from "zustand/react/shallow";
import { renderContext } from "../Render";
import { useSlots } from "../../lib/use-slots";
import { ContextSlotRender, SlotRenderPure } from "../SlotRender";
import { expandNode } from "../../lib/data/flatten-node";
import { useFieldTransformsTracked } from "../../lib/field-transforms/use-field-transforms-tracked";
import { getInlineTextTransform } from "../../lib/field-transforms/default-transforms/inline-text-transform";
import { getSlotTransform } from "../../lib/field-transforms/default-transforms/slot-transform";
import { getRichTextTransform } from "../../lib/field-transforms/default-transforms/rich-text-transform";
import { FieldTransforms } from "../../types/API/FieldTransforms";
import { useRichtextProps } from "../RichTextEditor/lib/use-richtext-props";
import { MemoizeComponent } from "../MemoizeComponent";

const getClassName = getClassNameFactory("DropZone", styles);

export { DropZoneProvider, dropZoneContext } from "./context";

export type DropZoneDndData = {
  areaId?: string;
  depth: number;
  path: UniqueIdentifier[];
  isDroppableTarget: boolean;
};

const InsertPreview = ({
  element,
  label,
  override,
}: {
  element?: Element;
  label: string;
  override?: Overrides["drawerItem"];
}) => {
  if (element) {
    return (
      // Safe to use this since the HTML is set by the user
      <div dangerouslySetInnerHTML={{ __html: element.outerHTML }} />
    );
  }

  return <DrawerItemInner name={label}>{override}</DrawerItemInner>;
};

export const DropZoneEditPure = (props: DropZoneProps) => (
  <DropZoneEdit {...props} />
);

const DropZoneChild = ({
  zoneCompound,
  componentId,
  index,
  dragAxis,
  collisionAxis,
  inDroppableZone,
}: {
  zoneCompound: string;
  componentId: string;
  index: number;
  dragAxis: DragAxis;
  collisionAxis?: DragAxis;
  inDroppableZone: boolean;
}) => {
  const metadata = useAppStore((s) => s.metadata);

  const ctx = useContext(dropZoneContext);
  const { depth = 1 } = ctx ?? {};

  const zoneStore = useContext(ZoneStoreContext);

  const nodeProps = useAppStore(
    useShallow((s) => {
      return s.state.indexes.nodes[componentId]?.flatData.props;
    })
  );

  const nodeType = useAppStore(
    (s) => s.state.indexes.nodes[componentId]?.data.type
  );

  const nodeReadOnly = useAppStore(
    useShallow((s) => s.state.indexes.nodes[componentId]?.data.readOnly)
  );

  const appStore = useAppStoreApi();

  const item = useMemo(() => {
    if (nodeProps) {
      const expanded = expandNode({
        type: nodeType,
        props: nodeProps,
      }) as ComponentData;

      return expanded;
    }

    const preview = zoneStore.getState().previewIndex[zoneCompound];

    if (componentId === preview?.props.id) {
      return {
        type: preview.componentType,
        props: preview.props,
        previewType: preview.type,
        element: preview.element,
      };
    }

    return null;
  }, [appStore, componentId, zoneCompound, nodeType, nodeProps]);

  const componentConfig = useAppStore((s) =>
    item?.type ? s.config.components[item.type] : null
  );

  const puckProps: PuckContext = useMemo(
    () => ({
      renderDropZone: DropZoneEditPure,
      isEditing: true,
      dragRef: null,
      metadata: { ...metadata, ...componentConfig?.metadata },
    }),
    [metadata, componentConfig?.metadata]
  );

  const overrides = useAppStore((s) => s.overrides);
  const isLoading = useAppStore(
    (s) => s.componentState[componentId]?.loadingCount > 0
  );
  const isSelected = useAppStore(
    (s) => s.selectedItem?.props.id === componentId || false
  );

  let label = componentConfig?.label ?? item?.type.toString() ?? "Component";

  const defaultsProps = useMemo(
    () => ({
      ...componentConfig?.defaultProps,
      ...item?.props,
      puck: puckProps,
      editMode: true, // DEPRECATED
    }),
    [componentConfig?.defaultProps, item?.props, puckProps]
  );

  const defaultedNode = useMemo(
    () => ({ type: item?.type ?? nodeType, props: defaultsProps }),
    [item?.type, nodeType, defaultsProps]
  );

  const config = useAppStore((s) => s.config);

  const plugins = useAppStore((s) => s.plugins);
  const userFieldTransforms = useAppStore((s) => s.fieldTransforms);
  const combinedFieldTransforms = useMemo(
    () => ({
      ...getSlotTransform(DropZoneEditPure, (slotProps) => (
        <ContextSlotRender componentId={componentId} zone={slotProps.zone} />
      )),
      ...getInlineTextTransform(),
      ...getRichTextTransform(),
      ...plugins.reduce<FieldTransforms>(
        (acc, plugin) => ({ ...acc, ...plugin.fieldTransforms }),
        {}
      ),
      ...userFieldTransforms,
    }),
    [plugins, userFieldTransforms]
  );

  const transformedProps = useFieldTransformsTracked(
    config,
    defaultedNode,
    combinedFieldTransforms,
    nodeReadOnly,
    isLoading
  );

  if (!item) return;

  const Render = componentConfig
    ? componentConfig.render
    : () => (
        <div style={{ padding: 48, textAlign: "center" }}>
          No configuration for {item.type}
        </div>
      );

  let componentType = item.type as string;

  const isInserting =
    "previewType" in item ? item.previewType === "insert" : false;

  return (
    <DraggableComponent
      id={componentId}
      componentType={componentType}
      zoneCompound={zoneCompound}
      depth={depth + 1}
      index={index}
      isLoading={isLoading}
      isSelected={isSelected}
      label={label}
      autoDragAxis={dragAxis}
      userDragAxis={collisionAxis}
      inDroppableZone={inDroppableZone}
    >
      {(dragRef) => {
        if (componentConfig?.inline && !isInserting) {
          return (
            <MemoizeComponent
              Component={Render}
              componentProps={{
                ...transformedProps,
                puck: { ...transformedProps.puck, dragRef },
              }}
            />
          );
        }

        return (
          <div ref={dragRef}>
            {isInserting ? (
              <InsertPreview
                label={label}
                override={overrides.componentItem ?? overrides.drawerItem}
                element={
                  "element" in item && item.element ? item.element : undefined
                }
              />
            ) : (
              <MemoizeComponent
                Component={Render}
                componentProps={transformedProps}
              />
            )}
          </div>
        );
      }}
    </DraggableComponent>
  );
};

const DropZoneChildMemo = memo(DropZoneChild);

export const useSlot = ({
  zone,
  allow,
  disallow,
  minEmptyHeight: userMinEmptyHeight = "128px",
  collisionAxis,
}: Omit<DropZoneProps, "as" | "style" | "className">): [
  RefObject<HTMLElement | null>,
  ReactNode
] => {
  const ctx = useContext(dropZoneContext);
  const appStoreApi = useAppStoreApi();

  const {
    // These all need setting via context
    areaId,
    depth = 0,
    registerLocalZone,
    unregisterLocalZone,
  } = ctx ?? {};

  const path = useAppStore(
    useShallow((s) => (areaId ? s.state.indexes.nodes[areaId]?.path : null))
  );

  let zoneCompound = rootDroppableId;

  if (areaId) {
    if (zone !== rootDroppableId) {
      zoneCompound = `${areaId}:${zone}`;
    }
  }

  const isRootZone =
    zoneCompound === rootDroppableId ||
    zone === rootDroppableId ||
    areaId === "root";

  const inNextDeepestArea = useContextStore(
    ZoneStoreContext,
    (s) => s.nextAreaDepthIndex[areaId || ""]
  );

  const zoneContentIds = useAppStore(
    useShallow((s) => {
      return s.state.indexes.zones[zoneCompound]?.contentIds;
    })
  );
  const zoneType = useAppStore(
    useShallow((s) => {
      return s.state.indexes.zones[zoneCompound]?.type;
    })
  );

  // Register zone on mount
  useEffect(() => {
    if (!zoneType || zoneType === "dropzone") {
      if (ctx?.registerZone) {
        ctx?.registerZone(zoneCompound);
      }
    }
  }, [zoneType, appStoreApi]);

  useEffect(() => {
    if (zoneType === "dropzone") {
      if (zoneCompound !== rootDroppableId) {
        console.warn(
          "DropZones have been deprecated in favor of slot fields and will be removed in a future version of Puck. Please see the migration guide: https://www.puckeditor.com/docs/guides/migrations/dropzones-to-slots"
        );
      }
    }
  }, [zoneType]);

  const contentIds = useMemo(() => {
    return zoneContentIds || [];
  }, [zoneContentIds]);

  const acceptsTarget = useCallback(
    (componentType: string | null | undefined) => {
      if (!componentType) {
        return true;
      }

      if (disallow) {
        const defaultedAllow = allow || [];

        // remove any explicitly allowed items from disallow
        const filteredDisallow = (disallow || []).filter(
          (item) => defaultedAllow.indexOf(item) === -1
        );

        if (filteredDisallow.indexOf(componentType) !== -1) {
          return false;
        }
      } else if (allow) {
        if (allow.indexOf(componentType) === -1) {
          return false;
        }
      }

      return true;
    },
    [allow, disallow]
  );

  const targetAccepted = useContextStore(ZoneStoreContext, (s) => {
    const draggedComponentType = s.draggedItem?.data.componentType;
    return acceptsTarget(draggedComponentType);
  });

  const hoveringOverArea = inNextDeepestArea || isRootZone;

  const isEnabled = useContextStore(ZoneStoreContext, (s) => {
    let _isEnabled = true;
    const isDeepestZone = s.zoneDepthIndex[zoneCompound] ?? false;

    _isEnabled = isDeepestZone;

    if (_isEnabled) {
      _isEnabled = targetAccepted;
    }

    return _isEnabled;
  });

  useEffect(() => {
    if (registerLocalZone) {
      registerLocalZone(zoneCompound, targetAccepted || isEnabled);
    }

    return () => {
      if (unregisterLocalZone) {
        unregisterLocalZone(zoneCompound);
      }
    };
  }, [targetAccepted, isEnabled, zoneCompound]);

  const [contentIdsWithPreview, preview] = useContentIdsWithPreview(
    contentIds,
    zoneCompound
  );

  const isDropEnabled =
    isEnabled &&
    (preview
      ? contentIdsWithPreview.length === 1
      : contentIdsWithPreview.length === 0);

  const zoneStore = useContext(ZoneStoreContext);

  useEffect(() => {
    const { enabledIndex } = zoneStore.getState();
    zoneStore.setState({
      enabledIndex: { ...enabledIndex, [zoneCompound]: isEnabled },
    });
  }, [isEnabled, zoneStore, zoneCompound]);

  const droppableConfig: UseDroppableInput<DropZoneDndData> = {
    id: zoneCompound,
    collisionPriority: isEnabled ? depth : 0,
    disabled: !isDropEnabled,
    collisionDetector: pointerIntersection,
    type: "dropzone",
    data: {
      areaId,
      depth,
      isDroppableTarget: targetAccepted,
      path: path || [],
    },
  };

  const ref = useRef<HTMLDivElement | null>(null);

  const { ref: dropRef } = useDroppable(droppableConfig);

  const isAreaSelected = useAppStore(
    (s) => s?.selectedItem && areaId === s?.selectedItem.props.id
  );

  const [dragAxis] = useDragAxis(ref, collisionAxis);

  const [minEmptyHeight, isAnimating] = useMinEmptyHeight({
    zoneCompound,
    userMinEmptyHeight,
    ref,
  });

  useEffect(() => {
    if (ref.current) {
      dropRef(ref.current);

      const classesToRemove = [
        getClassName(),
        getClassName({ isRootZone: true }, { excludeBase: true }),
        getClassName({ hoveringOverArea: true }, { excludeBase: true }),
        getClassName({ isEnabled: true }, { excludeBase: true }),
        getClassName({ isAreaSelected: true }, { excludeBase: true }),
        getClassName({ hasChildren: true }, { excludeBase: true }),
        getClassName({ isAnimating: true }, { excludeBase: true }),
      ].filter((c) => c);

      ref.current.classList.remove(...classesToRemove);

      const classesToAdd = [
        getClassName(),
        getClassName({ isRootZone }, { excludeBase: true }),
        getClassName({ hoveringOverArea }, { excludeBase: true }),
        getClassName({ isEnabled }, { excludeBase: true }),
        getClassName({ isAreaSelected }, { excludeBase: true }),
        getClassName(
          { hasChildren: contentIds.length > 0 },
          { excludeBase: true }
        ),
        getClassName({ isAnimating }, { excludeBase: true }),
      ].filter((c) => c);

      ref.current.classList.add(...classesToAdd);

      ref.current.setAttribute("data-testid", `dropzone:${zoneCompound}`);
      ref.current.setAttribute("data-puck-dropzone", zoneCompound);
      if (typeof minEmptyHeight !== "undefined") {
        ref.current.style.setProperty(
          "--min-empty-height",
          typeof minEmptyHeight === "number"
            ? `${minEmptyHeight}px`
            : minEmptyHeight
        );
      }
    }
  }, [
    ref,
    isRootZone,
    hoveringOverArea,
    isEnabled,
    isAreaSelected,
    contentIds.length,
    isAnimating,
    zoneCompound,
    minEmptyHeight,
  ]);

  return [
    ref,
    contentIdsWithPreview.map((componentId, i) => {
      return (
        <DropZoneChildMemo
          key={componentId}
          zoneCompound={zoneCompound}
          componentId={componentId}
          dragAxis={dragAxis}
          index={i}
          collisionAxis={collisionAxis}
          inDroppableZone={targetAccepted}
        />
      );
    }),
  ];
};

export const DropZoneEdit = forwardRef<HTMLDivElement, DropZoneProps>(
  function DropZoneEditInternal(props, userRef) {
    const [ref, children] = useSlot(props);

    const setRefs = useCallback(
      (node: any) => {
        assignRefs<any>([ref, userRef], node);
      },
      [ref, userRef]
    );

    const El = props.as ?? "div";

    return (
      <El ref={setRefs} className={props.className} style={props.style}>
        {children}
      </El>
    );
  }
);

const DropZoneRenderItem = ({
  config,
  item,
  metadata,
}: {
  config: Config;
  item: ComponentData;
  metadata: Metadata;
}) => {
  const Component = config.components[item.type];

  const props = useSlots(config, item, (slotProps) => (
    <SlotRenderPure {...slotProps} config={config} metadata={metadata} />
  )) as WithPuckProps<ComponentData["props"]>;

  const nextContextValue = useMemo<DropZoneContext>(
    () => ({
      areaId: props.id,
      depth: 1,
    }),
    [props]
  );

  const richtextProps = useRichtextProps(Component.fields, props);

  return (
    <DropZoneProvider key={props.id} value={nextContextValue}>
      <Component.render
        {...props}
        {...richtextProps}
        puck={{
          ...props.puck,
          renderDropZone: DropZoneRenderPure,
          metadata: { ...metadata, ...Component.metadata },
        }}
      />
    </DropZoneProvider>
  );
};

export const DropZoneRenderPure = (props: DropZoneProps) => (
  <DropZoneRender {...props} />
);

const DropZoneRender = forwardRef<HTMLDivElement, DropZoneProps>(
  function DropZoneRenderInternal({ className, style, zone, as }, ref) {
    const ctx = useContext(dropZoneContext);
    const { areaId = "root" } = ctx || {};
    const { config, data, metadata } = useContext(renderContext);

    let zoneCompound = `${areaId}:${zone}`;
    let content = data?.content || [];

    // Register zones if running Render mode inside editor (i.e. previewMode === "interactive")
    useEffect(() => {
      // Only register zones, not slots
      if (!content) {
        if (ctx?.registerZone) {
          ctx?.registerZone(zoneCompound);
        }
      }
    }, [content]);

    const El = as ?? "div";

    if (!data || !config) {
      return null;
    }

    if (zoneCompound !== rootDroppableId) {
      content = setupZone(data, zoneCompound).zones[zoneCompound];
    }
    return (
      <El className={className} style={style} ref={ref}>
        {content.map((item) => {
          const Component = config.components[item.type];
          if (Component) {
            return (
              <DropZoneRenderItem
                key={item.props.id}
                config={config}
                item={item}
                metadata={metadata}
              />
            );
          }

          return null;
        })}
      </El>
    );
  }
);

export const DropZonePure = (props: DropZoneProps) => <DropZone {...props} />;

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  function DropZone(props: DropZoneProps, ref) {
    const ctx = useContext(dropZoneContext);

    if (ctx?.mode === "edit") {
      return (
        <>
          <DropZoneEdit {...props} ref={ref} />
        </>
      );
    }

    return (
      <>
        <DropZoneRender {...props} ref={ref} />
      </>
    );
  }
);
