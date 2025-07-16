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
import { Components } from "../Components";
import { Outline } from "../Outline";
import { Canvas } from "../Canvas";
import { Fields } from "../Fields";
import { MenuItem, Nav } from "../Nav";
import { Hammer, Layers, ToyBrick } from "lucide-react";

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

  const leftSideBarVisible = useAppStore((s) => s.state.ui.leftSideBarVisible);
  const rightSideBarVisible = useAppStore(
    (s) => s.state.ui.rightSideBarVisible
  );

  const dispatch = useAppStore((s) => s.dispatch);

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

  const [view, setView] = useState<"blocks" | "outline" | string>("blocks");

  const pluginItems = useMemo(() => {
    const details: Record<string, MenuItem & { render: () => ReactElement }> =
      {};

    plugins?.forEach((plugin) => {
      if (plugin.name && plugin.render) {
        details[plugin.name] = {
          label: plugin.label ?? plugin.name,
          icon: plugin.icon ?? <ToyBrick />,
          onClick: () => {
            setView(plugin.name!);
          },
          isActive: view === plugin.name,
          render: plugin.render,
        };
      }
    });

    return details;
  }, [plugins, view]);

  const PluginRender = useMemo(() => {
    if (view === "blocks") {
      return Components;
    } else if (view === "outline") {
      return Outline;
    } else {
      return pluginItems[view]?.render;
    }
  }, [view]);

  return (
    <div className={`Puck ${getClassName()}`}>
      <DragDropContext disableAutoScroll={dnd?.disableAutoScroll}>
        <CustomPuck>
          {children || (
            <div
              className={getLayoutClassName({
                leftSideBarVisible,
                mounted,
                rightSideBarVisible,
              })}
            >
              <div className={getLayoutClassName("inner")}>
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
                          ...pluginItems,
                        },
                      },
                    }}
                  />
                </div>
                <div className={getLayoutClassName("leftSideBar")}>
                  {leftSideBarVisible && <PluginRender />}
                </div>
                <Canvas />
                <div className={getLayoutClassName("rightSideBar")}>
                  <FieldSideBar />
                </div>
              </div>
            </div>
          )}
        </CustomPuck>
      </DragDropContext>
      <div id="puck-portal-root" className={getClassName("portal")} />
    </div>
  );
};
