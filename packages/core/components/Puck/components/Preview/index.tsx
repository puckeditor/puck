import { DropZoneEditPure, DropZonePure } from "../../../DropZone";
import { rootDroppableId } from "../../../../lib/root-droppable-id";
import { RefObject, useEffect, useRef, useMemo, memo } from "react";
import { useAppStore } from "../../../../store";
import AutoFrame, { autoFrameContext } from "../../../AutoFrame";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../../../lib";
import { DefaultRootRenderProps } from "../../../../types";
import { Render } from "../../../Render";
import { BubbledPointerEvent } from "../../../../lib/bubble-pointer-event";
import { useSlots } from "../../../../lib/use-slots";
import { useRichtextProps } from "../../../RichTextEditor/lib/use-richtext-props";
import { getFrame } from "../../../../lib/get-frame";

const getClassName = getClassNameFactory("PuckPreview", styles);

type PageProps = DefaultRootRenderProps;

const useBubbleIframeEvents = (ref: RefObject<HTMLIFrameElement | null>) => {
  const status = useAppStore((s) => s.status);

  useEffect(() => {
    if (ref.current && status === "READY") {
      const iframe = ref.current;

      const handlePointerMove = (event: PointerEvent) => {
        const evt = new BubbledPointerEvent("pointermove", {
          ...event,
          bubbles: true,
          cancelable: false,
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          originalTarget: event.target,
        });

        iframe.dispatchEvent(evt as any);
      };

      const register = () => {
        unregister();

        // Add event listeners
        iframe.contentDocument?.addEventListener(
          "pointermove",
          handlePointerMove,
          {
            capture: true,
          }
        );
      };

      const unregister = () => {
        // Clean up event listeners
        iframe.contentDocument?.removeEventListener(
          "pointermove",
          handlePointerMove
        );
      };

      register();

      return () => {
        unregister();
      };
    }
  }, [status]);
};

const Page = memo(({ config, ...pageProps }: { config: any } & PageProps) => {
  const propsWithSlots = useSlots(
    config,
    { type: "root", props: pageProps },
    DropZoneEditPure
  );

  const richtextProps = useRichtextProps(config.root?.fields ?? {}, pageProps);

  return config.root?.render ? (
    config.root?.render({
      id: "puck-root",
      ...propsWithSlots,
      ...richtextProps,
    })
  ) : (
    <>{propsWithSlots.children}</>
  );
});

Page.displayName = "Page";

export const Preview = ({ id = "puck-preview" }: { id?: string }) => {
  const dispatch = useAppStore((s) => s.dispatch);
  const root = useAppStore((s) => s.state.data.root);
  const config = useAppStore((s) => s.config);
  const status = useAppStore((s) => s.status);
  const setStatus = useAppStore((s) => s.setStatus);
  const iframe = useAppStore((s) => s.iframe);
  const overrides = useAppStore((s) => s.overrides);
  const metadata = useAppStore((s) => s.metadata);
  const previewMode = useAppStore((s) => s.state.ui.previewMode);
  const renderData = useAppStore((s) =>
    s.state.ui.previewMode === "edit" ? null : s.state.data
  );

  const Frame = useMemo(() => overrides.iframe, [overrides]);

  // DEPRECATED
  const rootProps = root.props || root;

  const ref = useRef<HTMLIFrameElement>(null);

  useBubbleIframeEvents(ref);

  // Expose the current preview mode on the canvas entry so CSS can hide
  // editor-only styles (e.g. overlay portal outlines) while interactive.
  useEffect(() => {
    const entry = getFrame()?.querySelector("[data-puck-entry]");

    entry?.setAttribute("data-puck-preview-mode", previewMode);
  }, [previewMode, status, iframe.enabled]);

  const inner = !renderData ? (
    <Page
      {...rootProps}
      config={config}
      puck={{
        renderDropZone: DropZonePure,
        isEditing: true,
        dragRef: null,
        metadata,
      }}
      editMode={true} // DEPRECATED
    >
      <DropZonePure zone={rootDroppableId} />
    </Page>
  ) : (
    <Render data={renderData} config={config} metadata={metadata} />
  );

  useEffect(() => {
    if (!iframe.enabled) {
      setStatus("READY");
    }
  }, [iframe.enabled]);

  return (
    <div
      className={getClassName()}
      id={id}
      data-puck-preview
      onClick={(e) => {
        const el = e.target as Element;

        if (
          !el.hasAttribute("data-puck-component") &&
          !el.hasAttribute("data-puck-dropzone")
        ) {
          dispatch({ type: "setUi", ui: { itemSelector: null } });
        }
      }}
    >
      {iframe.enabled ? (
        <AutoFrame
          id="preview-frame"
          className={getClassName("frame")}
          data-rfd-iframe
          syncHostStyles={iframe.syncHostStyles}
          onReady={() => {
            setStatus("READY");
          }}
          onNotReady={() => {
            setStatus("MOUNTED");
          }}
          frameRef={ref}
        >
          <autoFrameContext.Consumer>
            {({ document }) => {
              if (Frame) {
                return <Frame document={document}>{inner}</Frame>;
              }

              return inner;
            }}
          </autoFrameContext.Consumer>
        </AutoFrame>
      ) : (
        <div
          id="preview-frame"
          className={getClassName("frame")}
          ref={ref}
          data-puck-entry
        >
          {inner}
        </div>
      )}
    </div>
  );
};
