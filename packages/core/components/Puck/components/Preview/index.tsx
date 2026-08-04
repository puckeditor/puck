import { RefObject, useEffect, useRef, useMemo } from "react";

import { useAppStore } from "../../../../store";
import { getClassNameFactory } from "../../../../lib";
import { BubbledPointerEvent } from "../../../../lib/bubble-pointer-event";

import AutoFrame, { autoFrameContext } from "../../../AutoFrame";
import { Render } from "../../../Render";

import EditorPage from "./components/editor-page";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("PuckPreview", styles);

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

const usePreviewModeAttribute = (ref: RefObject<HTMLIFrameElement | null>) => {
  const previewMode = useAppStore((s) => s.state.ui.previewMode);
  const status = useAppStore((s) => s.status);
  const iframeEnabled = useAppStore((s) => s.iframe.enabled);

  // Expose the current preview mode on the canvas entry so CSS can hide
  // editor-only styles (e.g. overlay portal outlines) while interactive.
  useEffect(() => {
    const entry = iframeEnabled
      ? ref.current?.contentDocument?.querySelector("[data-puck-entry]")
      : ref.current;

    entry?.setAttribute("data-puck-preview-mode", previewMode);
  }, [previewMode, status, iframeEnabled]);
};

export const Preview = ({ id = "puck-preview" }: { id?: string }) => {
  const dispatch = useAppStore((s) => s.dispatch);
  const config = useAppStore((s) => s.config);
  const setStatus = useAppStore((s) => s.setStatus);
  const iframe = useAppStore((s) => s.iframe);
  const overrides = useAppStore((s) => s.overrides);
  const metadata = useAppStore((s) => s.metadata);
  const renderData = useAppStore((s) =>
    s.state.ui.previewMode === "edit" ? null : s.state.data
  );

  const Frame = useMemo(() => overrides.iframe, [overrides]);

  const ref = useRef<HTMLIFrameElement>(null);

  useBubbleIframeEvents(ref);
  usePreviewModeAttribute(ref);

  const inner = !renderData ? (
    <EditorPage />
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
