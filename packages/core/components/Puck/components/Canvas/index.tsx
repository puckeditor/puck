import { getBox } from "css-box-model";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppStore } from "../../../../store";
import { ViewportControls } from "../../../ViewportControls";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../../../lib";
import { Preview } from "../Preview";
import { UiState } from "../../../../types";
import { Loader } from "../../../Loader";
import { useShallow } from "zustand/react/shallow";
import { useCanvasFrame } from "../../../../lib/frame-context";

const getClassName = getClassNameFactory("PuckCanvas", styles);

const ZOOM_ON_CHANGE = true;

export const Canvas = () => {
  // Use the shared canvas frame hook - must be called before other hooks to maintain hook order
  const { frameRef, resetAutoZoom } = useCanvasFrame();
  
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
    leftSidebarWidth,
    rightSidebarWidth,
    viewports,
  } = useAppStore(
    useShallow((s) => ({
      leftSideBarVisible: s.state.ui.leftSideBarVisible,
      rightSideBarVisible: s.state.ui.rightSideBarVisible,
      leftSidebarWidth: s.state.ui.leftSidebarWidth,
      rightSidebarWidth: s.state.ui.rightSidebarWidth,
      viewports: s.state.ui.viewports,
    }))
  );

  const [showTransition, setShowTransition] = useState(false);

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
    setShowTransition(false);
    resetAutoZoom(viewports);
  }, [
    frameRef,
    leftSideBarVisible,
    rightSideBarVisible,
    leftSidebarWidth,
    rightSidebarWidth,
    resetAutoZoom,
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
      setShowTransition(true);
      resetAutoZoom(viewports);
    }
  }, [viewports.current.width, resetAutoZoom, viewports]);

  // Resize based on window size
  useEffect(() => {
    const cb = () => {
      setShowTransition(false);
      resetAutoZoom();
    };

    window.addEventListener("resize", cb);

    return () => {
      window.removeEventListener("resize", cb);
    };
  }, [resetAutoZoom]);

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
      onClick={() =>
        dispatch({
          type: "setUi",
          ui: { itemSelector: null },
          recordHistory: true,
        })
      }
    >
      {viewports.controlsVisible && iframe.enabled && (
        <div className={getClassName("controls")}>
          <ViewportControls
            autoZoom={zoomConfig.autoZoom}
            zoom={zoomConfig.zoom}
            onViewportChange={(viewport) => {
              setShowTransition(true);

              const uiViewport = {
                ...viewport,
                height: viewport.height || "auto",
                zoom: zoomConfig.zoom,
              };

              const newUi: Partial<UiState> = {
                viewports: { ...viewports, current: uiViewport },
                itemSelector: null,
              };

              setUi(newUi);

              if (ZOOM_ON_CHANGE) {
                resetAutoZoom({ ...viewports, current: uiViewport });
              }
            }}
            onZoom={(zoom) => {
              setShowTransition(true);

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
              ? "width 150ms ease-out, height 150ms ease-out, transform 150ms ease-out"
              : "",
            overflow: iframe.enabled ? undefined : "auto",
          }}
          suppressHydrationWarning // Suppress hydration warning as frame is not visible until after load
          id="puck-canvas-root"
          onTransitionEnd={() => {
            resetAutoZoom();
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
