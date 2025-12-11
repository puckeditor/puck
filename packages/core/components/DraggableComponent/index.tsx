import {
  CSSProperties,
  ReactNode,
  Ref,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import styles from "./styles.module.css";
import "./styles.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Copy, CornerLeftUp, Trash } from "lucide-react";
import { useAppStore, useAppStoreApi } from "../../store";
import { Loader } from "../Loader";
import { ActionBar } from "../ActionBar";

import { createPortal } from "react-dom";

import { dropZoneContext, DropZoneProvider } from "../DropZone";
import { createDynamicCollisionDetector } from "../../lib/dnd/collision/dynamic";
import { DragAxis } from "../../types";
import { UniqueIdentifier } from "@dnd-kit/abstract";
import { getDeepScrollPosition } from "../../lib/get-deep-scroll-position";
import { DropZoneContext, ZoneStoreContext } from "../DropZone/context";
import { useShallow } from "zustand/react/shallow";
import { getItem } from "../../lib/data/get-item";
import { useSortable } from "@dnd-kit/react/sortable";
import { accumulateTransform } from "../../lib/accumulate-transform";
import { useContextStore } from "../../lib/use-context-store";
import { useOnDragFinished } from "../../lib/dnd/use-on-drag-finished";
import { LoadedRichTextMenu } from "../RichTextMenu";

const getClassName = getClassNameFactory("DraggableComponent", styles);

const DEBUG = false;

// Magic numbers are used to position actions overlay 8px from top of component, bottom of component (when sticky scrolling) and side of preview
const space = 8;
const actionsOverlayTop = space * 6.5;
const actionsTop = -(actionsOverlayTop - 8);
const actionsSide = space;

const DefaultActionBar = ({
  label,
  children,
  parentAction,
}: {
  label: string | undefined;
  children: ReactNode;
  parentAction: ReactNode;
}) => (
  <ActionBar>
    <ActionBar.Group>
      {parentAction}
      {label && <ActionBar.Label label={label} />}
    </ActionBar.Group>
    <ActionBar.Group>{children}</ActionBar.Group>
  </ActionBar>
);

const DefaultOverlay = ({
  children,
}: {
  children: ReactNode;
  hover: boolean;
  isSelected: boolean;
  componentId: string;
  componentType: string;
}) => <>{children}</>;

export type ComponentDndData = {
  areaId?: string;
  zone: string;
  index: number;
  componentType: string;
  containsActiveZone: boolean;
  depth: number;
  path: UniqueIdentifier[];
  inDroppableZone: boolean;
};

export const DraggableComponent = ({
  children,
  depth,
  componentType,
  id,
  index,
  zoneCompound,
  isLoading = false,
  isSelected = false,
  debug,
  label,
  autoDragAxis,
  userDragAxis,
  inDroppableZone = true,
}: {
  children: (ref: Ref<any>) => ReactNode;
  componentType: string;
  depth: number;
  id: string;
  index: number;
  zoneCompound: string;
  isSelected?: boolean;
  debug?: string;
  label?: string;
  isLoading: boolean;
  autoDragAxis: DragAxis;
  userDragAxis?: DragAxis;
  inDroppableZone: boolean;
}) => {
  const zoom = useAppStore((s) =>
    s.selectedItem?.props.id === id ? s.zoomConfig.zoom : 1
  );
  const overrides = useAppStore((s) => s.overrides);
  const dispatch = useAppStore((s) => s.dispatch);
  const iframe = useAppStore((s) => s.iframe);

  const ctx = useContext(dropZoneContext);

  const [localZones, setLocalZones] = useState<Record<string, boolean>>({});

  const registerLocalZone = useCallback(
    (zoneCompound: string, active: boolean) => {
      // Propagate local zone
      ctx?.registerLocalZone?.(zoneCompound, active);

      setLocalZones((obj) => ({
        ...obj,
        [zoneCompound]: active,
      }));
    },
    [setLocalZones]
  );

  const unregisterLocalZone = useCallback(
    (zoneCompound: string) => {
      // Propagate local zone
      ctx?.unregisterLocalZone?.(zoneCompound);

      setLocalZones((obj) => {
        const newLocalZones = {
          ...obj,
        };

        delete newLocalZones[zoneCompound];

        return newLocalZones;
      });
    },
    [setLocalZones]
  );

  const containsActiveZone =
    Object.values(localZones).filter(Boolean).length > 0;

  const path = useAppStore(useShallow((s) => s.state.indexes.nodes[id]?.path));
  const permissions = useAppStore(
    useShallow((s) => {
      const item = getItem({ index, zone: zoneCompound }, s.state);

      return s.permissions.getPermissions({ item });
    })
  );

  const zoneStore = useContext(ZoneStoreContext);

  const [dragAxis, setDragAxis] = useState(userDragAxis || autoDragAxis);

  const dynamicCollisionDetector = useMemo(
    () => createDynamicCollisionDetector(dragAxis),
    [dragAxis]
  );

  const {
    ref: sortableRef,
    isDragging: thisIsDragging,
    sortable,
  } = useSortable<ComponentDndData>({
    id,
    index,
    group: zoneCompound,
    type: "component",
    data: {
      areaId: ctx?.areaId,
      zone: zoneCompound,
      index,
      componentType,
      containsActiveZone,
      depth,
      path: path || [],
      inDroppableZone,
    },
    collisionPriority: depth,
    collisionDetector: dynamicCollisionDetector,
    // "Out of the way" transition from react-beautiful-dnd
    transition: {
      duration: 200,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
    feedback: "clone",
  });

  useEffect(() => {
    const isEnabled = zoneStore.getState().enabledIndex[zoneCompound];

    sortable.droppable.disabled = !isEnabled;
    sortable.draggable.disabled = !permissions.drag;

    const cleanup = zoneStore.subscribe((s) => {
      sortable.droppable.disabled = !s.enabledIndex[zoneCompound];
    });

    if (ref.current && !permissions.drag) {
      ref.current.setAttribute("data-puck-disabled", "");

      return () => {
        ref.current?.removeAttribute("data-puck-disabled");
        cleanup();
      };
    }

    return cleanup;
  }, [permissions.drag, zoneCompound]);

  const [, setRerender] = useState(0);

  const ref = useRef<HTMLElement>(null);

  const refSetter = useCallback(
    (el: HTMLElement | null) => {
      sortableRef(el);

      if (ref.current !== el) {
        ref.current = el;
        setRerender((update) => update + 1);
      }
    },
    [sortableRef]
  );

  const [portalEl, setPortalEl] = useState<HTMLElement>();

  useEffect(() => {
    setPortalEl(
      iframe.enabled
        ? ref.current?.ownerDocument.body
        : ref.current?.closest<HTMLElement>("[data-puck-preview]") ??
            document.body
    );
  }, [iframe.enabled, ref.current]);

  const getStyle = useCallback(() => {
    if (!ref.current) return;

    const rect = ref.current!.getBoundingClientRect();
    const deepScrollPosition = getDeepScrollPosition(ref.current);

    const portalContainerEl = iframe.enabled
      ? null
      : ref.current?.closest<HTMLElement>("[data-puck-preview]");

    const portalContainerRect = portalContainerEl?.getBoundingClientRect();
    const portalScroll = portalContainerEl
      ? getDeepScrollPosition(portalContainerEl)
      : { x: 0, y: 0 };

    const scroll = {
      x:
        deepScrollPosition.x -
        portalScroll.x -
        (portalContainerRect?.left ?? 0),
      y:
        deepScrollPosition.y - portalScroll.y - (portalContainerRect?.top ?? 0),
    };

    const untransformed = {
      height: ref.current.offsetHeight,
      width: ref.current.offsetWidth,
    };

    const transform = accumulateTransform(ref.current);

    const style: CSSProperties = {
      left: `${(rect.left + scroll.x) / transform.scaleX}px`,
      top: `${(rect.top + scroll.y) / transform.scaleY}px`,
      height: `${untransformed.height}px`,
      width: `${untransformed.width}px`,
    };

    return style;
  }, [ref.current]);

  const [style, setStyle] = useState<CSSProperties>();

  const sync = useCallback(() => {
    setStyle(getStyle());
  }, [ref.current, iframe]);

  useEffect(() => {
    if (ref.current) {
      const observer = new ResizeObserver(sync);

      observer.observe(ref.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [ref.current]);

  const registerNode = useAppStore((s) => s.nodes.registerNode);

  const hideOverlay = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showOverlay = useCallback(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    registerNode(id, {
      methods: { sync, showOverlay, hideOverlay },
      element: ref.current ?? null,
    });

    return () => {
      registerNode(id, {
        methods: {
          sync: () => null,
          hideOverlay: () => null,
          showOverlay: () => null,
        },
        element: null,
      });
    };
  }, [id, zoneCompound, index, componentType, sync]);

  const CustomActionBar = useMemo(
    () => overrides.actionBar || DefaultActionBar,
    [overrides.actionBar]
  );

  const CustomOverlay = useMemo(
    () => overrides.componentOverlay || DefaultOverlay,
    [overrides.componentOverlay]
  );

  const onClick = useCallback(
    (e: Event | SyntheticEvent) => {
      const el = e.target as Element;

      if (!el.closest("[data-puck-overlay-portal]")) {
        e.stopPropagation();
      }

      dispatch({
        type: "setUi",
        ui: {
          itemSelector: { index, zone: zoneCompound },
        },
      });
    },
    [index, zoneCompound, id]
  );

  const appStore = useAppStoreApi();

  const onSelectParent = useCallback(() => {
    const { nodes, zones } = appStore.getState().state.indexes;
    const node = nodes[id];

    const parentNode = node?.parentId ? nodes[node?.parentId] : null;

    if (!parentNode || !node.parentId) {
      return;
    }

    const parentZoneCompound = `${parentNode.parentId}:${parentNode.zone}`;

    const parentIndex = zones[parentZoneCompound].contentIds.indexOf(
      node.parentId
    );

    dispatch({
      type: "setUi",
      ui: {
        itemSelector: {
          zone: parentZoneCompound,
          index: parentIndex,
        },
      },
    });
  }, [ctx, path]);

  const onDuplicate = useCallback(() => {
    dispatch({
      type: "duplicate",
      sourceIndex: index,
      sourceZone: zoneCompound,
    });
  }, [index, zoneCompound]);

  const onDelete = useCallback(() => {
    dispatch({
      type: "remove",
      index: index,
      zone: zoneCompound,
    });
  }, [index, zoneCompound]);

  const [hover, setHover] = useState(false);

  const indicativeHover = useContextStore(
    ZoneStoreContext,
    (s) => s.hoveringComponent === id
  );

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const el = ref.current as HTMLElement;

    const _onMouseOver = (e: Event) => {
      const userIsDragging = !!zoneStore.getState().draggedItem;

      if (userIsDragging) {
        // User is dragging, and dragging this item
        if (thisIsDragging) {
          setHover(true);
        } else {
          setHover(false);
        }
      } else {
        setHover(true);
      }

      e.stopPropagation();
    };

    const _onMouseOut = (e: Event) => {
      e.stopPropagation();

      setHover(false);
    };

    el.setAttribute("data-puck-component", id);
    el.setAttribute("data-puck-dnd", id);
    el.style.position = "relative";
    el.addEventListener("click", onClick);
    el.addEventListener("mouseover", _onMouseOver);
    el.addEventListener("mouseout", _onMouseOut);

    return () => {
      el.removeAttribute("data-puck-component");
      el.removeAttribute("data-puck-dnd");
      el.removeEventListener("click", onClick);
      el.removeEventListener("mouseover", _onMouseOver);
      el.removeEventListener("mouseout", _onMouseOut);
    };
  }, [
    ref.current, // Remount attributes if the element changes
    onClick,
    containsActiveZone,
    zoneCompound,
    id,
    thisIsDragging,
    inDroppableZone,
  ]);

  const [isVisible, setIsVisible] = useState(false);
  const [dragFinished, setDragFinished] = useState(true);
  const [_, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      if (hover || indicativeHover || isSelected) {
        sync();
        setIsVisible(true);
        setThisWasDragging(false);
      } else {
        setIsVisible(false);
      }
    });
  }, [hover, indicativeHover, isSelected, iframe]);

  const [thisWasDragging, setThisWasDragging] = useState(false);

  const onDragFinished = useOnDragFinished((finished) => {
    if (finished) {
      startTransition(() => {
        sync();
        setDragFinished(true);
      });
    } else {
      setDragFinished(false);
    }
  });

  useEffect(() => {
    if (thisIsDragging) {
      setThisWasDragging(true);
    }
  }, [thisIsDragging]);

  useEffect(() => {
    if (thisWasDragging) return onDragFinished();
  }, [thisWasDragging, onDragFinished]);

  const syncActionsPosition = useCallback(
    (el: HTMLDivElement | null | undefined) => {
      if (el) {
        const view = el.ownerDocument.defaultView;

        if (view) {
          const rect = el.getBoundingClientRect();

          const diffLeft = rect.x;
          const exceedsBoundsLeft = diffLeft < 0;
          const diffTop = rect.y;
          const exceedsBoundsTop = diffTop < 0;

          // Modify position if it spills over frame
          if (exceedsBoundsLeft) {
            el.style.transformOrigin = "left top";
            el.style.left = "0px";
          }

          if (exceedsBoundsTop) {
            el.style.top = "12px";
            if (!exceedsBoundsLeft) {
              el.style.transformOrigin = "right top";
            }
          }
        }
      }
    },
    [zoom]
  );

  useEffect(() => {
    if (userDragAxis) {
      setDragAxis(userDragAxis);
      return;
    }

    if (ref.current) {
      const computedStyle = window.getComputedStyle(ref.current);

      if (
        computedStyle.display === "inline" ||
        computedStyle.display === "inline-block"
      ) {
        setDragAxis("x");

        return;
      }
    }

    setDragAxis(autoDragAxis);
  }, [ref, userDragAxis, autoDragAxis]);

  const parentAction = useMemo(
    () =>
      ctx?.areaId &&
      ctx?.areaId !== "root" && (
        <ActionBar.Action onClick={onSelectParent} label="Select parent">
          <CornerLeftUp size={16} />
        </ActionBar.Action>
      ),
    [ctx?.areaId]
  );

  const nextContextValue = useMemo<DropZoneContext>(
    () => ({
      ...ctx!,
      areaId: id,
      zoneCompound,
      index,
      depth: depth + 1,
      registerLocalZone,
      unregisterLocalZone,
    }),
    [
      ctx,
      id,
      zoneCompound,
      index,
      depth,
      registerLocalZone,
      unregisterLocalZone,
    ]
  );

  const richText = useAppStore((s) =>
    s.currentRichText?.inlineComponentId === id ? s.currentRichText : null
  );

  const hasNormalActions = permissions.duplicate || permissions.delete;

  return (
    <DropZoneProvider value={nextContextValue}>
      {dragFinished &&
        isVisible &&
        createPortal(
          <div
            className={getClassName({
              isSelected,
              isDragging: thisIsDragging,
              hover: hover || indicativeHover,
            })}
            style={{ ...style }}
            data-puck-overlay
          >
            {debug}
            {isLoading && (
              <div className={getClassName("loadingOverlay")}>
                <Loader />
              </div>
            )}
            <div
              className={getClassName("actionsOverlay")}
              style={{
                top: actionsOverlayTop / zoom,
              }}
            >
              <div
                className={getClassName("actions")}
                style={{
                  transform: `scale(${1 / zoom}`,
                  top: actionsTop / zoom,
                  right: 0,
                  paddingLeft: actionsSide,
                  paddingRight: actionsSide,
                }}
                ref={syncActionsPosition}
              >
                <CustomActionBar
                  parentAction={parentAction}
                  label={DEBUG ? id : label}
                >
                  {richText && (
                    <>
                      <LoadedRichTextMenu
                        editor={richText.editor}
                        field={richText.field}
                        inline
                        readOnly={false}
                      />
                      {hasNormalActions && <ActionBar.Separator />}
                    </>
                  )}

                  {permissions.duplicate && (
                    <ActionBar.Action onClick={onDuplicate} label="Duplicate">
                      <Copy size={16} />
                    </ActionBar.Action>
                  )}
                  {permissions.delete && (
                    <ActionBar.Action onClick={onDelete} label="Delete">
                      <Trash size={16} />
                    </ActionBar.Action>
                  )}
                </CustomActionBar>
              </div>
            </div>
            <div className={getClassName("overlayWrapper")}>
              <CustomOverlay
                componentId={id}
                componentType={componentType}
                hover={hover}
                isSelected={isSelected}
              >
                <div className={getClassName("overlay")}></div>
              </CustomOverlay>
            </div>
          </div>,
          portalEl || document.body
        )}
      {children(refSetter)}
    </DropZoneProvider>
  );
};
