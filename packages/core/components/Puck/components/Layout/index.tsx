import { ReactNode, useEffect, useMemo, useState } from "react";
import { getClassNameFactory } from "../../../../lib";
import { IframeConfig, UiState } from "../../../../types";
import { usePropsContext } from "../..";
import styles from "./styles.module.css";
import { useInjectGlobalCss } from "../../../../lib/use-inject-css";
import { useAppStore } from "../../../../store";
import { DefaultOverride } from "../../../DefaultOverride";
import { monitorHotkeys, useMonitorHotkeys } from "../../../../lib/use-hotkey";
import { getFrame } from "../../../../lib/get-frame";
import { usePreviewModeHotkeys } from "../../../../lib/use-preview-mode-hotkeys";
import { DragDropContext } from "../../../DragDropContext";
import { Header } from "../Header";
import { SidebarSection } from "../../../SidebarSection";
import { Components } from "../Components";
import { Outline } from "../Outline";
import { Canvas } from "../Canvas";
import { Fields } from "../Fields";
import { useSidebarResize } from "../../../../lib/use-sidebar-resize";
import { FrameProvider } from "../../../../lib/frame-context";
import { Sidebar } from "../Sidebar";
import { useDeleteHotkeys } from "../../../../lib/use-delete-hotkeys";
import { Nav } from "../Nav";
import { Hammer, Heading1, Layers } from "lucide-react";

const getClassName = getClassNameFactory("Puck", styles);
const getLayoutClassName = getClassNameFactory("PuckLayout", styles);

const FieldSideBar = () => {
  const title = useAppStore((s) =>
    s.selectedItem
      ? s.config.components[s.selectedItem.type]?.["label"] ??
        s.selectedItem.type.toString()
      : "Page"
  );

  return (
    <SidebarSection noPadding noBorderTop showBreadcrumbs title={title}>
      <Fields />
    </SidebarSection>
  );
};

export const Layout = ({ children }: { children: ReactNode }) => {
  const {
    iframe: _iframe,
    dnd,
    initialHistory: _initialHistory,
  } = usePropsContext();

  const iframe: IframeConfig = useMemo(
    () => ({
      enabled: true,
      waitForStyles: true,
      ..._iframe,
    }),
    [_iframe]
  );

  useInjectGlobalCss(iframe.enabled);

  const dispatch = useAppStore((s) => s.dispatch);
  const leftSideBarVisible = useAppStore((s) => s.state.ui.leftSideBarVisible);
  const rightSideBarVisible = useAppStore(
    (s) => s.state.ui.rightSideBarVisible
  );

  const {
    width: leftWidth,
    setWidth: setLeftWidth,
    sidebarRef: leftSidebarRef,
    handleResizeEnd: handleLeftSidebarResizeEnd,
  } = useSidebarResize("left", dispatch);

  const {
    width: rightWidth,
    setWidth: setRightWidth,
    sidebarRef: rightSidebarRef,
    handleResizeEnd: handleRightSidebarResizeEnd,
  } = useSidebarResize("right", dispatch);

  useEffect(() => {
    if (!window.matchMedia("(min-width: 638px)").matches) {
      dispatch({
        type: "setUi",
        ui: {
          leftSideBarVisible: false,
          rightSideBarVisible: false,
        },
      });
    }

    const handleResize = () => {
      if (!window.matchMedia("(min-width: 638px)").matches) {
        dispatch({
          type: "setUi",
          ui: (ui: UiState) => ({
            ...ui,
            ...(ui.rightSideBarVisible ? { leftSideBarVisible: false } : {}),
          }),
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const overrides = useAppStore((s) => s.overrides);

  const CustomPuck = useMemo(
    () => overrides.puck || DefaultOverride,
    [overrides]
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ready = useAppStore((s) => s.status === "READY");

  useMonitorHotkeys();

  useEffect(() => {
    if (ready && iframe.enabled) {
      const frameDoc = getFrame();

      if (frameDoc) {
        return monitorHotkeys(frameDoc);
      }
    }
  }, [ready, iframe.enabled]);

  usePreviewModeHotkeys();
  useDeleteHotkeys();

  const layoutOptions: Record<string, any> = {};

  if (leftWidth) {
    layoutOptions["--puck-user-left-side-bar-width"] = `${leftWidth}px`;
  }

  if (rightWidth) {
    layoutOptions["--puck-user-right-side-bar-width"] = `${rightWidth}px`;
  }

  const [view, setView] = useState<"blocks" | "outline" | "headings">("blocks");

  return (
    <div className={`Puck ${getClassName()}`}>
      <DragDropContext disableAutoScroll={dnd?.disableAutoScroll}>
        <CustomPuck>
          {children || (
            <FrameProvider>
              <div
                className={getLayoutClassName({
                  leftSideBarVisible,
                  mounted,
                  rightSideBarVisible,
                })}
              >
                <div
                  className={getLayoutClassName("inner")}
                  style={layoutOptions}
                >
                  <Header />
                  <div className={getLayoutClassName("nav")}>
                    <Nav
                      slim
                      navigation={{
                        main: {
                          items: {
                            build: {
                              label: "Blocks",
                              icon: <Hammer />,
                              onClick: () => {
                                setView("blocks");
                              },
                              isActive: view === "blocks",
                            },
                            outline: {
                              label: "Outline",
                              icon: <Layers />,
                              onClick: () => {
                                setView("outline");
                              },
                              isActive: view === "outline",
                            },
                            headings: {
                              label: "Headings",
                              icon: <Heading1 />,
                              onClick: () => {
                                setView("headings");
                              },
                              isActive: view === "headings",
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  <Sidebar
                    position="left"
                    sidebarRef={leftSidebarRef}
                    isVisible={leftSideBarVisible}
                    onResize={setLeftWidth}
                    onResizeEnd={handleLeftSidebarResizeEnd}
                  >
                    {leftSideBarVisible && (
                      <>
                        {view === "blocks" && <Components />}
                        {view === "outline" && <Outline />}
                      </>
                    )}
                  </Sidebar>
                  <Canvas />
                  <Sidebar
                    position="right"
                    sidebarRef={rightSidebarRef}
                    isVisible={rightSideBarVisible}
                    onResize={setRightWidth}
                    onResizeEnd={handleRightSidebarResizeEnd}
                  >
                    <FieldSideBar />
                  </Sidebar>
                </div>
              </div>
            </FrameProvider>
          )}
        </CustomPuck>
      </DragDropContext>
      <div id="puck-portal-root" className={getClassName("portal")} />
    </div>
  );
};
