import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { getClassNameFactory } from "../../../../lib";
import { IframeConfig, UiState } from "../../../../types";
import { usePropsContext } from "../..";
import styles from "./styles.module.css";
import { useInjectGlobalCss } from "../../../../lib/use-inject-css";
import { useAppStore, useAppStoreApi } from "../../../../store";
import { DefaultOverride } from "../../../DefaultOverride";
import { monitorHotkeys, useMonitorHotkeys } from "../../../../lib/use-hotkey";
import { getFrame } from "../../../../lib/get-frame";
import { usePreviewModeHotkeys } from "../../../../lib/use-preview-mode-hotkeys";
import { DragDropContext } from "../../../DragDropContext";
import { Header } from "../Header";
import { SidebarSection } from "../../../SidebarSection";
import { Canvas } from "../Canvas";
import { Fields } from "../Fields";
import { useSidebarResize } from "../../../../lib/use-sidebar-resize";
import { FrameProvider } from "../../../../lib/frame-context";
import { Sidebar } from "../Sidebar";
import { useDeleteHotkeys } from "../../../../lib/use-delete-hotkeys";
import { MenuItem, Nav } from "../Nav";
import { IconButton } from "../../../IconButton";
import { Maximize2, Minimize2, ToyBrick } from "lucide-react";
import {
  blocksPlugin,
  fieldsPlugin,
  outlinePlugin,
} from "../../../../lib/default-plugins";
import { PluginInternal } from "../../../../types/Internal";

const getClassName = getClassNameFactory("Puck", styles);
const getLayoutClassName = getClassNameFactory("PuckLayout", styles);
const getPluginTabClassName = getClassNameFactory("PuckPluginTab", styles);

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

const PluginTab = ({
  children,
  visible,
  mobileOnly,
}: {
  children: ReactNode;
  visible: boolean;
  mobileOnly?: boolean;
}) => {
  return (
    <div className={getPluginTabClassName({ visible, mobileOnly })}>
      <div className={getPluginTabClassName("body")}>{children}</div>
    </div>
  );
};

export const Layout = ({ children }: { children: ReactNode }) => {
  const {
    iframe: _iframe,
    dnd,
    initialHistory: _initialHistory,
    plugins,
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

  const setUi = useAppStore((s) => s.setUi);
  const currentPlugin = useAppStore((s) => s.state.ui.plugin?.current);
  const appStoreApi = useAppStoreApi();

  const pluginItems = useMemo(() => {
    const details: Record<string, MenuItem & { render: () => ReactElement }> =
      {};

    const defaultPlugins: PluginInternal[] = [blocksPlugin(), outlinePlugin()];

    const combinedPlugins: PluginInternal[] = [
      ...defaultPlugins,
      ...(plugins ?? []),
    ];

    if (!plugins?.some((p) => p.name === "fields")) {
      combinedPlugins.push(fieldsPlugin());
    }

    combinedPlugins?.forEach((plugin) => {
      if (plugin.name && plugin.render) {
        if (details[plugin.name]) {
          // Delete existing plugins with this name to enable user sorting
          delete details[plugin.name];
        }

        details[plugin.name] = {
          label: plugin.label ?? plugin.name,
          icon: plugin.icon ?? <ToyBrick />,
          onClick: () => {
            if (plugin.name === currentPlugin) {
              if (leftSideBarVisible) {
                setUi({ leftSideBarVisible: false });
              } else {
                setUi({ leftSideBarVisible: true });
              }
            } else {
              if (plugin.name) {
                setUi({
                  plugin: { current: plugin.name },
                  leftSideBarVisible: true,
                });
              }
            }
          },
          isActive: leftSideBarVisible && currentPlugin === plugin.name,
          render: plugin.render,
          mobileOnly: plugin.mobileOnly,
        };
      }
    });

    return details;
  }, [plugins, currentPlugin, appStoreApi, leftSideBarVisible]);

  useEffect(() => {
    if (!currentPlugin) {
      const names = Object.keys(pluginItems);

      setUi({ plugin: { current: names[0] } });
    }
  }, [pluginItems, currentPlugin]);

  const hasDesktopFieldsPlugin =
    pluginItems["fields"] && pluginItems["fields"].mobileOnly === false;

  const [isExpanded, setIsExpanded] = useState(false);

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
                  rightSideBarVisible:
                    !hasDesktopFieldsPlugin && rightSideBarVisible,
                  isExpanded,
                })}
              >
                <div
                  className={getLayoutClassName("inner")}
                  style={layoutOptions}
                >
                  <div className={getLayoutClassName("header")}>
                    <Header />
                  </div>
                  <div className={getLayoutClassName("nav")}>
                    <Nav
                      slim
                      navigation={{
                        main: {
                          items: pluginItems,
                        },
                      }}
                      mobileActions={
                        leftSideBarVisible && (
                          <IconButton
                            type="button"
                            title="maximize"
                            onClick={() => {
                              setIsExpanded((s) => !s);
                            }}
                          >
                            {isExpanded ? (
                              <Minimize2 size={21} />
                            ) : (
                              <Maximize2 size={21} />
                            )}
                          </IconButton>
                        )
                      }
                    />
                  </div>
                  <Sidebar
                    position="left"
                    sidebarRef={leftSidebarRef}
                    isVisible={leftSideBarVisible}
                    onResize={setLeftWidth}
                    onResizeEnd={handleLeftSidebarResizeEnd}
                  >
                    {Object.entries(pluginItems).map(
                      ([id, { mobileOnly, render: Render, label }]) => (
                        <PluginTab
                          key={id}
                          visible={currentPlugin === id}
                          mobileOnly={mobileOnly}
                        >
                          <Render />
                        </PluginTab>
                      )
                    )}
                  </Sidebar>
                  <Canvas />
                  {!hasDesktopFieldsPlugin && (
                    <Sidebar
                      position="right"
                      sidebarRef={rightSidebarRef}
                      isVisible={rightSideBarVisible}
                      onResize={setRightWidth}
                      onResizeEnd={handleRightSidebarResizeEnd}
                    >
                      <FieldSideBar />
                    </Sidebar>
                  )}
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
