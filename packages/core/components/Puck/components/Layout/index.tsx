import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
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
import { Canvas } from "../Canvas";
import { Fields } from "../Fields";
import { useSidebarResize } from "../../../../lib/use-sidebar-resize";
import { FrameProvider } from "../../../../lib/frame-context";
import { Sidebar } from "../Sidebar";
import { useDeleteHotkeys } from "../../../../lib/use-delete-hotkeys";
import { MenuItem, Nav } from "../Nav";
import { IconButton } from "../../../IconButton";
import { Maximize2, Minimize2, ToyBrick } from "lucide-react";
import { PluginInternal } from "../../../../types/Internal";
import { blocksPlugin } from "../../../../plugins/blocks";
import { outlinePlugin } from "../../../../plugins/outline";
import { fieldsPlugin } from "../../../../plugins/fields";

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
    <SidebarSection noBorderTop showBreadcrumbs title={title}>
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

type PluginMenuItem = MenuItem & {
  id: string;
  render: () => ReactElement;
  pluginIndex: number;
  __name?: string;
};

const isLegacySideBar = (plugin?: PluginInternal) =>
  plugin?.__name === "legacy-side-bar";

const isFieldsPlugin = (plugin?: PluginInternal) =>
  plugin?.__name === "fields";

export const Layout = ({ children }: { children?: ReactNode }) => {
  const {
    iframe: _iframe,
    dnd,
    initialHistory: _initialHistory,
    plugins,
    height,
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

  const instanceId = useAppStore((s) => s.instanceId);

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
  const currentPluginIndex = useAppStore((s) => {
    const value = s.state.ui.plugin?.current;

    return typeof value === "number" ? value : null;
  });

  const [mobilePanelHeightMode, setMobilePanelHeightMode] = useState<
    "toggle" | "min-content"
  >("toggle");

  const hasLegacySideBarPlugin = useMemo(
    () =>
      (plugins ?? []).some((plugin) =>
        isLegacySideBar(plugin as PluginInternal)
      ),
    [plugins]
  );

  const pluginItems = useMemo<PluginMenuItem[]>(() => {
    const providedPlugins = (plugins ?? []) as PluginInternal[];
    const defaultPlugins: PluginInternal[] = [blocksPlugin(), outlinePlugin()];

    const normalizedProvidedPlugins = [
      ...providedPlugins.filter((plugin) => isLegacySideBar(plugin)),
      ...providedPlugins.filter((plugin) => !isLegacySideBar(plugin)),
    ];

    const missingDefaults = defaultPlugins.filter(
      (defaultPlugin) =>
        !normalizedProvidedPlugins.some(
          (plugin) => plugin.__name === defaultPlugin.__name
        )
    );

    const combinedPlugins: PluginInternal[] = [
      ...missingDefaults,
      ...normalizedProvidedPlugins,
    ];

    if (!normalizedProvidedPlugins.some((plugin) => isFieldsPlugin(plugin))) {
      combinedPlugins.push(fieldsPlugin());
    }

    const pluginMap = new Map<string, PluginInternal>();

    combinedPlugins.forEach((plugin, idx) => {
      if (!plugin.render) {
        return;
      }

      const key = plugin.__name ?? `plugin-${idx}`;

      if (pluginMap.has(key)) {
        pluginMap.delete(key);
      }

      pluginMap.set(key, plugin);
    });

    return Array.from(pluginMap.entries()).map(([id, plugin], index) => ({
      id,
      __name: plugin.__name,
      pluginIndex: index,
      label: plugin.label ?? plugin.__name ?? `Plugin ${index + 1}`,
      icon: plugin.icon ?? <ToyBrick />,
      onClick: () => {
        setMobilePanelHeightMode(plugin.mobilePanelHeight ?? "toggle");

        if (index === currentPluginIndex) {
          if (leftSideBarVisible) {
            setUi({ leftSideBarVisible: false });
          } else {
            setUi({ leftSideBarVisible: true });
          }
        } else {
          setUi({
            plugin: { current: index },
            leftSideBarVisible: true,
          });
        }
      },
      isActive: leftSideBarVisible && currentPluginIndex === index,
      render: plugin.render!,
      mobileOnly: hasLegacySideBarPlugin || plugin.mobileOnly,
      desktopOnly: isLegacySideBar(plugin) || plugin.desktopOnly,
    }));
  }, [
    plugins,
    currentPluginIndex,
    leftSideBarVisible,
    hasLegacySideBarPlugin,
    setUi,
    setMobilePanelHeightMode,
  ]);

  useEffect(() => {
    if (!pluginItems.length) {
      return;
    }

    if (
      currentPluginIndex === null ||
      currentPluginIndex === undefined ||
      currentPluginIndex >= pluginItems.length
    ) {
      setUi({ plugin: { current: 0 } });
    }
  }, [pluginItems, currentPluginIndex, setUi]);

  const fieldsPluginItem = pluginItems.find(
    (item) => item.__name === "fields"
  );

  const hasDesktopFieldsPlugin =
    !!fieldsPluginItem && fieldsPluginItem.mobileOnly === false;

  const mobilePanelExpanded = useAppStore(
    (s) => s.state.ui.mobilePanelExpanded ?? false
  );

  return (
    <div
      className={`Puck ${getClassName({
        hidePlugins: hasLegacySideBarPlugin,
      })}`}
      id={instanceId}
    >
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
                  isExpanded: mobilePanelExpanded,
                  mobilePanelHeightToggle: mobilePanelHeightMode === "toggle",
                  mobilePanelHeightMinContent:
                    mobilePanelHeightMode === "min-content",
                })}
                style={{ height }}
              >
                <div
                  className={getLayoutClassName("inner")}
                  style={layoutOptions}
                >
                  <div className={getLayoutClassName("header")}>
                    <Header hidePlugins={hasLegacySideBarPlugin} />
                  </div>
                  <div className={getLayoutClassName("nav")}>
                    <Nav
                      items={pluginItems}
                      mobileActions={
                        leftSideBarVisible &&
                        mobilePanelHeightMode === "toggle" && (
                          <IconButton
                            type="button"
                            title="maximize"
                            onClick={() => {
                              setUi({
                                mobilePanelExpanded: !mobilePanelExpanded,
                              });
                            }}
                          >
                            {mobilePanelExpanded ? (
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
                    {pluginItems.map(
                      ({ id, mobileOnly, render: Render, pluginIndex }) => (
                        <PluginTab
                          key={id}
                          visible={currentPluginIndex === pluginIndex}
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
