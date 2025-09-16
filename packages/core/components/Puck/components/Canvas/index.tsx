import { getBox } from "css-box-model";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppStore } from "../../../../store";
import { ViewportControls } from "../../../ViewportControls";
import styles from "./styles.module.css";
import { getClassNameFactory, useResetAutoZoom } from "../../../../lib";
import { Preview } from "../Preview";
import { UiState } from "../../../../types";
import { Loader } from "../../../Loader";
import { useShallow } from "zustand/react/shallow";
import { useCanvasFrame } from "../../../../lib/frame-context";

const getClassName = getClassNameFactory("PuckCanvas", styles);

const ZOOM_ON_CHANGE = true;
const TRANSITION_DURATION = 150;

export const Canvas = () => {
  const { frameRef } = useCanvasFrame();
  const resetAutoZoom = useResetAutoZoom(frameRef);

  const {
    dispatch,
    overrides,
    setUi,
    zoomConfig,
    setZoomConfig,
    status,
    iframe,
  } = useAppStore(
    useShallow((s) => ({
      dispatch: s.dispatch,
      overrides: s.overrides,
      setUi: s.setUi,
      zoomConfig: s.zoomConfig,
      setZoomConfig: s.setZoomConfig,
      status: s.status,
      iframe: s.iframe,
    }))
  );
  const {
    leftSideBarVisible,
    rightSideBarVisible,
    leftSideBarWidth,
    rightSideBarWidth,
    viewports,
  } = useAppStore(
    useShallow((s) => ({
      leftSideBarVisible: s.state.ui.leftSideBarVisible,
      rightSideBarVisible: s.state.ui.rightSideBarVisible,
      leftSideBarWidth: s.state.ui.leftSideBarWidth,
      rightSideBarWidth: s.state.ui.rightSideBarWidth,
      viewports: s.state.ui.viewports,
    }))
  );

  const [showTransition, setShowTransition] = useState(false);
  const isResizingRef = useRef(false);

  const defaultRender = useMemo<
    React.FunctionComponent<{ children?: ReactNode }>
  >(() => {
    const PuckDefault = ({ children }: { children?: ReactNode }) => (
      <>{children}</>
    );

    return PuckDefault;
  }, []);

  const CustomPreview = useMemo(
    () => overrides.preview || defaultRender,
    [overrides]
  );

  const getFrameDimensions = useCallback(() => {
    if (frameRef.current) {
      const frame = frameRef.current;

      const box = getBox(frame);

      return { width: box.contentBox.width, height: box.contentBox.height };
    }

    return { width: 0, height: 0 };
  }, [frameRef]);

  // Auto zoom
  useEffect(() => {
    resetAutoZoom();
  }, [
    frameRef,
    leftSideBarVisible,
    rightSideBarVisible,
    leftSideBarWidth,
    rightSideBarWidth,
    viewports,
  ]);

  // Constrain height
  useEffect(() => {
    const { height: frameHeight } = getFrameDimensions();

    if (viewports.current.height === "auto") {
      setZoomConfig({
        ...zoomConfig,
        rootHeight: frameHeight / zoomConfig.zoom,
      });
    }
  }, [zoomConfig.zoom, getFrameDimensions, setZoomConfig]);

  // Zoom whenever state changes, even if external driver
  useEffect(() => {
    if (ZOOM_ON_CHANGE) {
      resetAutoZoom();
    }
  }, [viewports.current.width, viewports]);

  // Resize based on frame size
  useEffect(() => {
    if (!frameRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!isResizingRef.current) {
        resetAutoZoom();
      }
    });

    resizeObserver.observe(frameRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [frameRef.current]);

  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShowLoader(true);
    }, 500);
  }, []);

  return (
    <div
      className={getClassName({
        ready: status === "READY" || !iframe.enabled || !iframe.waitForStyles,
        showLoader,
      })}
      onClick={(e) => {
        const el = e.target as Element;

        if (
          !el.hasAttribute("data-puck-component") &&
          !el.hasAttribute("data-puck-dropzone")
        ) {
          dispatch({
            type: "setUi",
            ui: { itemSelector: null },
            recordHistory: true,
          });
        }
      }}
    >
      {viewports.controlsVisible && iframe.enabled && (
        <div className={getClassName("controls")}>
          <ViewportControls
            autoZoom={zoomConfig.autoZoom}
            zoom={zoomConfig.zoom}
            onViewportChange={(viewport) => {
              setShowTransition(true);
              isResizingRef.current = true;

              const uiViewport = {
                ...viewport,
                height: viewport.height || "auto",
                zoom: zoomConfig.zoom,
              };

              const newUi: Partial<UiState> = {
                viewports: { ...viewports, current: uiViewport },
              };

              setUi(newUi);

              if (ZOOM_ON_CHANGE) {
                resetAutoZoom({
                  viewports: { ...viewports, current: uiViewport },
                });
              }
            }}
            onZoom={(zoom) => {
              setShowTransition(true);
              isResizingRef.current = true;

              setZoomConfig({ ...zoomConfig, zoom });
            }}
          />
        </div>
      )}
      <div className={getClassName("inner")} ref={frameRef}>
        <div
          className={getClassName("root")}
          style={{
            width: iframe.enabled ? viewports.current.width : "100%",
            height: zoomConfig.rootHeight,
            transform: iframe.enabled ? `scale(${zoomConfig.zoom})` : undefined,
            transition: showTransition
              ? `width ${TRANSITION_DURATION}ms ease-out, height ${TRANSITION_DURATION}ms ease-out, transform ${TRANSITION_DURATION}ms ease-out`
              : "",
            overflow: iframe.enabled ? undefined : "auto",
          }}
          suppressHydrationWarning // Suppress hydration warning as frame is not visible until after load
          id="puck-canvas-root"
          onTransitionEnd={() => {
            setShowTransition(false);
            isResizingRef.current = false;
          }}
        >
          <CustomPreview>
            <Preview />
          </CustomPreview>
        </div>
        <div className={getClassName("loader")}>
          <Loader size={24} />
        </div>
      </div>
    </div>
  );
};
