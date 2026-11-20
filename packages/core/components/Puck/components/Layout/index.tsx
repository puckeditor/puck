import {
  ReactElement,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { getClassNameFactory } from "../../../../lib";
import { IframeConfig, UiState } from "../../../../types";
import { usePropsContext } from "../..";
import styles from "./styles.module.css";
import { useInjectUiCss } from "../../../../lib/use-inject-css";
import { useAppStore, useAppStoreApi } from "../../../../store";
import { useMessage } from "../../../../lib/use-message";
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
import { normalizeIframeConfig } from "../../../../lib/style-config";

const getClassName = getClassNameFactory("Puck", styles);
const getLayoutClassName = getClassNameFactory("PuckLayout", styles);
const getPluginTabClassName = getClassNameFactory("PuckPluginTab", styles);
const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const desktopQuery = "(min-width: 638px)";

const subscribeToResize = (onResize: () => void) => {
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
  };
};

// Matches the breakpoint where the layout CSS switches between the mobile
// panel and the desktop sidebars. Assumes desktop on the server.
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeToResize,
    () => window.matchMedia(desktopQuery).matches,
    () => true
  );

const FieldSideBar = () => {
  const pageLabel = useMessage("label-page");
  const title = useAppStore((s) =>
    s.selectedItem
      ? s.config.components[s.selectedItem.type]?.["label"] ??
        s.selectedItem.type.toString()
      : s.config.root?.label
  );

  return (
    <SidebarSection noBorderTop showBreadcrumbs title={title || pageLabel}>
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

export const Layout = ({ children }: { children?: ReactNode }) => {
  const {
    iframe: _iframe,
    initialHistory: _initialHistory,
    plugins,
    height,
  } = usePropsContext();

  const dnd = useAppStore((s) => s.dnd);

  const iframe: IframeConfig = useMemo(
    () => normalizeIframeConfig(_iframe),
    [_iframe]
  );

  useInjectUiCss();

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
    let wasDesktop = window.matchMedia(desktopQuery).matches;

    if (!wasDesktop) {
      dispatch({
        type: "setUi",
        ui: {
          leftSideBarVisible: false,
          rightSideBarVisible: false,
        },
      });
    }

    const handleResize = () => {
      const isDesktop = window.matchMedia(desktopQuery).matches;

      if (!isDesktop) {
        dispatch({
          type: "setUi",
          ui: (ui: UiState) => ({
            ...ui,
            ...(ui.rightSideBarVisible ? { leftSideBarVisible: false } : {}),
          }),
        });
      } else if (!wasDesktop) {
        // The fields move from the fields plugin to the right sidebar when
        // entering desktop, so keep them open if they were
        dispatch({
          type: "setUi",
          ui: (ui: UiState) => ({
            ...ui,
            ...(ui.leftSideBarVisible && ui.plugin?.current === "fields"
              ? { rightSideBarVisible: true }
              : {}),
          }),
        });
      }

      wasDesktop = isDesktop;
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

  useBrowserLayoutEffect(() => {
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
    layoutOptions["--puck-user-sidebar-left-width"] = `${leftWidth}px`;
  }

  if (rightWidth) {
    layoutOptions["--puck-user-sidebar-right-width"] = `${rightWidth}px`;
  }

  const setUi = useAppStore((s) => s.setUi);
  const currentPlugin = useAppStore((s) => s.state.ui.plugin?.current);
  const appStoreApi = useAppStoreApi();

  const hasLegacySideBarPlugin = useMemo(
    () => !!plugins?.find((p) => p.name === "legacy-side-bar"),
    [plugins]
  );

  // Localized labels for the built-in plugin tabs, passed into their factories.
  const blocksLabel = useMessage("plugin-blocks");
  const outlineLabel = useMessage("plugin-outline");
  const fieldsLabel = useMessage("plugin-fields");

  const pluginItems = useMemo(() => {
    const details: Record<
      string,
      MenuItem & {
        render: () => ReactElement;
        mobilePanelHeight: "toggle" | "min-content";
      }
    > = {};

    const defaultPlugins: PluginInternal[] = [
      blocksPlugin({ label: blocksLabel }),
      outlinePlugin({ label: outlineLabel }),
    ];

    const isLegacy = (plugin: PluginInternal) =>
      plugin.name === "legacy-side-bar" ? -1 : 0;

    // Always place legacy-side-bar first
    // Stable tie-break ensures consistent order for non-legacy plugins
    const combinedPlugins: PluginInternal[] = [
      ...defaultPlugins,
      ...(plugins ?? []),
    ].sort((a, b) => isLegacy(a) - isLegacy(b));

    if (!plugins?.some((p) => p.name === "fields")) {
      combinedPlugins.push(fieldsPlugin({ label: fieldsLabel }));
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
          render: plugin.render,
          mobilePanelHeight: plugin.mobilePanelHeight ?? "toggle",
          mobileOnly: hasLegacySideBarPlugin || plugin.mobileOnly,
          desktopOnly: plugin.name === "legacy-side-bar" || plugin.desktopOnly,
        };
      }
    });

    return details;
  }, [plugins, appStoreApi, blocksLabel, outlineLabel, fieldsLabel]);

  const isDesktop = useIsDesktop();

  // A mobile-only plugin has no nav item on desktop, so it's only rendered on
  // mobile. This also keeps the fields in one place: the fields plugin on
  // mobile, and the right sidebar on desktop.
  const pluginNames = Object.keys(pluginItems).filter(
    (name) => !(isDesktop && pluginItems[name].mobileOnly)
  );

  const activePlugin =
    currentPlugin && pluginNames.includes(currentPlugin)
      ? currentPlugin
      : pluginNames[0];

  const navItems: Record<string, MenuItem> = {};

  Object.keys(pluginItems).forEach((name) => {
    navItems[name] = {
      ...pluginItems[name],
      onClick: () => {
        if (name === activePlugin) {
          setUi({ leftSideBarVisible: !leftSideBarVisible });
        } else {
          setUi({ plugin: { current: name }, leftSideBarVisible: true });
        }
      },
      isActive: leftSideBarVisible && activePlugin === name,
    };
  });

  const mobilePanelHeightMode =
    pluginItems[activePlugin]?.mobilePanelHeight ?? "toggle";

  useEffect(() => {
    if (!currentPlugin) {
      const names = Object.keys(pluginItems);

      setUi({ plugin: { current: names[0] } });
    }
  }, [pluginItems, currentPlugin]);

  const hasDesktopFieldsPlugin =
    pluginItems["fields"] && pluginItems["fields"].mobileOnly === false;

  const mobilePanelExpanded = useAppStore(
    (s) => s.state.ui.mobilePanelExpanded ?? false
  );

  // Title follows the icon/action: collapse when expanded, expand otherwise.
  const maximizeLabel = useMessage("layout-maximize");
  const minimizeLabel = useMessage("layout-minimize");

  return (
    <div
      className={`Puck notranslate ${getClassName({
        hidePlugins: hasLegacySideBarPlugin,
      })}`}
      id={instanceId}
      // Opt out the whole editor UI out of automatic translations.
      // Browser translators modify the dom and are incompatible with dnd-kit
      translate="no"
      style={{ height, visibility: "hidden" }}
    >
      <DragDropContext
        disableAutoScroll={dnd?.disableAutoScroll}
        behavior={dnd?.behavior}
      >
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
                      items={navItems}
                      mobileActions={
                        leftSideBarVisible &&
                        mobilePanelHeightMode === "toggle" && (
                          <IconButton
                            type="button"
                            title={
                              mobilePanelExpanded
                                ? minimizeLabel
                                : maximizeLabel
                            }
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
                    {pluginNames.map((id) => {
                      const { mobileOnly, render: Render } = pluginItems[id];

                      return (
                        <PluginTab
                          key={id}
                          visible={activePlugin === id}
                          mobileOnly={mobileOnly}
                        >
                          <Render />
                        </PluginTab>
                      );
                    })}
                  </Sidebar>
                  <Canvas />
                  {isDesktop && !hasDesktopFieldsPlugin && (
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
