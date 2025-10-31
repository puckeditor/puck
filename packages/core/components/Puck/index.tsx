/* eslint-disable react-hooks/rules-of-hooks */
import {
  Context,
  createContext,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  UiState,
  IframeConfig,
  OnAction,
  Overrides,
  Permissions,
  Plugin,
  InitialHistory,
  UserGenerics,
  Config,
  Data,
  Metadata,
  AsFieldProps,
  DefaultComponentProps,
} from "../../types";

import { SidebarSection } from "../SidebarSection";

import { PuckAction } from "../../reducer";
import getClassNameFactory from "../../lib/get-class-name-factory";
import {
  createAppStore,
  defaultAppState,
  useAppStore,
  appStoreContext,
} from "../../store";
import styles from "./styles.module.css";
import { Fields } from "./components/Fields";
import { Components } from "./components/Components";
import { Preview } from "./components/Preview";
import { Outline } from "./components/Outline";
import { Canvas } from "./components/Canvas";
import { defaultViewports } from "../ViewportControls/default-viewports";
import { Viewports } from "../../types";
import { DragDropContext } from "../DragDropContext";
import { useLoadedOverrides } from "../../lib/use-loaded-overrides";
import { DefaultOverride } from "../DefaultOverride";
import { useInjectGlobalCss } from "../../lib/use-inject-css";
import { usePreviewModeHotkeys } from "../../lib/use-preview-mode-hotkeys";
import { useDeleteHotkeys } from "../../lib/use-delete-hotkeys";
import { useRegisterHistorySlice } from "../../store/slices/history";
import { useRegisterPermissionsSlice } from "../../store/slices/permissions";
import { useResolveDataOnMoved } from "../../lib/use-resolve-data-on-moved";
import { monitorHotkeys, useMonitorHotkeys } from "../../lib/use-hotkey";
import { getFrame } from "../../lib/get-frame";
import {
  UsePuckStoreContext,
  useRegisterUsePuckStore,
} from "../../lib/use-puck";
import { FrameProvider } from "../../lib/frame-context";
import { walkAppState } from "../../lib/data/walk-app-state";
import { PrivateAppState } from "../../types/Internal";
import fdeq from "fast-deep-equal";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { useSidebarResize } from "../../lib/use-sidebar-resize";
import { FieldTransforms } from "../../types/API/FieldTransforms";
import { populateIds } from "../../lib/data/populate-ids";
import { toComponent } from "../../lib/data/to-component";

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

type PuckProps<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
> = {
  children?: ReactNode;
  config: UserConfig;
  data: Partial<G["UserData"] | Data>;
  ui?: Partial<UiState>;
  onChange?: (data: G["UserData"]) => void;
  onPublish?: (data: G["UserData"]) => void;
  onAction?: OnAction<G["UserData"]>;
  permissions?: Partial<Permissions>;
  plugins?: Plugin<UserConfig>[];
  overrides?: Partial<Overrides<UserConfig>>;
  fieldTransforms?: FieldTransforms<UserConfig>;
  renderHeader?: (props: {
    children: ReactNode;
    dispatch: (action: PuckAction) => void;
    state: G["UserAppState"];
  }) => ReactElement;
  renderHeaderActions?: (props: {
    state: G["UserAppState"];
    dispatch: (action: PuckAction) => void;
  }) => ReactElement;
  headerTitle?: string;
  headerPath?: string;
  viewports?: Viewports;
  iframe?: IframeConfig;
  dnd?: {
    disableAutoScroll?: boolean;
  };
  initialHistory?: InitialHistory;
  metadata?: Metadata;
};

const propsContext = createContext<Partial<PuckProps>>({});

function PropsProvider<UserConfig extends Config = Config>(
  props: PuckProps<UserConfig>
) {
  return (
    <propsContext.Provider value={props as PuckProps}>
      {props.children}
    </propsContext.Provider>
  );
}

export const usePropsContext = () =>
  useContext<PuckProps>(propsContext as Context<PuckProps>);

function PuckProvider<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>({ children }: PropsWithChildren) {
  const {
    config,
    data: initialData,
    ui: initialUi,
    onChange,
    permissions = {},
    plugins,
    overrides,
    viewports = defaultViewports,
    iframe: _iframe,
    initialHistory: _initialHistory,
    metadata,
    onAction,
    fieldTransforms,
  } = usePropsContext();

  const iframe: IframeConfig = useMemo(
    () => ({
      enabled: true,
      waitForStyles: true,
      ..._iframe,
    }),
    [_iframe]
  );

  const [generatedAppState] = useState<G["UserAppState"]>(() => {
    const initial = { ...defaultAppState.ui, ...initialUi };

    let clientUiState: Partial<G["UserAppState"]["ui"]> = {};

    if (typeof window !== "undefined") {
      // Hide side bars on mobile
      if (window.matchMedia("(max-width: 638px)").matches) {
        clientUiState = {
          ...clientUiState,
          leftSideBarVisible: false,
          rightSideBarVisible: false,
        };
      }

      const viewportWidth = window.innerWidth;

      const viewportDifferences = Object.entries(viewports)
        .map(([key, value]) => ({
          key,
          diff: Math.abs(viewportWidth - value.width),
        }))
        .sort((a, b) => (a.diff > b.diff ? 1 : -1));

      const closestViewport = viewportDifferences[0].key as any;

      if (iframe.enabled) {
        clientUiState = {
          ...clientUiState,
          viewports: {
            ...initial.viewports,

            current: {
              ...initial.viewports.current,
              height:
                initialUi?.viewports?.current?.height ||
                viewports[closestViewport]?.height ||
                "auto",
              width:
                initialUi?.viewports?.current?.width ||
                viewports[closestViewport]?.width,
            },
          },
        };
      }
    }

    // DEPRECATED
    if (
      Object.keys(initialData?.root || {}).length > 0 &&
      !initialData?.root?.props
    ) {
      console.warn(
        "Warning: Defining props on `root` is deprecated. Please use `root.props`, or republish this page to migrate automatically."
      );
    }

    // Deprecated
    const rootProps = initialData?.root?.props || initialData?.root || {};

    const defaultedRootProps = {
      ...config.root?.defaultProps,
      ...(rootProps as AsFieldProps<DefaultComponentProps> | AsFieldProps<any>),
    };

    const root = populateIds(
      toComponent({ ...initialData?.root, props: defaultedRootProps }),
      config
    );

    const newAppState = {
      ...defaultAppState,
      data: {
        ...initialData,
        root: { ...initialData?.root, props: root.props },
        content: initialData.content || [],
      },
      ui: {
        ...initial,
        ...clientUiState,
        // Store categories under componentList on state to allow render functions and plugins to modify
        componentList: config.categories
          ? Object.entries(config.categories).reduce(
              (acc, [categoryName, category]) => {
                return {
                  ...acc,
                  [categoryName]: {
                    title: category.title,
                    components: category.components,
                    expanded: category.defaultExpanded,
                    visible: category.visible,
                  },
                };
              },
              {}
            )
          : {},
      },
    } as G["UserAppState"];

    return walkAppState(newAppState, config);
  });

  const { appendData = true } = _initialHistory || {};

  const [blendedHistories] = useState(
    [
      ...(_initialHistory?.histories || []),
      ...(appendData ? [{ state: generatedAppState }] : []),
    ].map((history) => {
      // Inject default data to enable partial history injections
      let newState = { ...generatedAppState, ...history.state };

      // The history generally doesn't include the indexes, so calculate them for each state item
      if (!(history.state as PrivateAppState).indexes) {
        newState = walkAppState(newState, config);
      }

      return {
        ...history,
        state: newState,
      };
    })
  );

  const initialHistoryIndex =
    _initialHistory?.index || blendedHistories.length - 1;
  const initialAppState = blendedHistories[initialHistoryIndex].state;

  // Load all plugins into the overrides
  const loadedOverrides = useLoadedOverrides({
    overrides: overrides,
    plugins: plugins,
  });

  const loadedFieldTransforms = useMemo(() => {
    const _plugins: Plugin[] = plugins || [];
    const pluginFieldTransforms = _plugins.reduce<FieldTransforms>(
      (acc, plugin) => ({ ...acc, ...plugin.fieldTransforms }),
      {}
    );

    return {
      ...pluginFieldTransforms,
      ...fieldTransforms,
    };
  }, [fieldTransforms, plugins]);

  const generateAppStore = useCallback(
    (state?: PrivateAppState) => {
      return {
        state,
        config,
        plugins: plugins || [],
        overrides: loadedOverrides,
        viewports,
        iframe,
        onAction,
        metadata,
        fieldTransforms: loadedFieldTransforms,
      };
    },
    [
      initialAppState,
      config,
      plugins,
      loadedOverrides,
      viewports,
      iframe,
      onAction,
      metadata,
      loadedFieldTransforms,
    ]
  );

  const [appStore] = useState(() =>
    createAppStore(generateAppStore(initialAppState))
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as any).__PUCK_INTERNAL_DO_NOT_USE = { appStore };
    }
  }, [appStore]);

  useEffect(() => {
    const state = appStore.getState().state;

    appStore.setState({
      ...generateAppStore(state),
    });
  }, [config, plugins, loadedOverrides, viewports, iframe, onAction, metadata]);

  useRegisterHistorySlice(appStore, {
    histories: blendedHistories,
    index: initialHistoryIndex,
    initialAppState,
  });

  const previousData = useRef<Data>(null);

  useEffect(() => {
    return appStore.subscribe(
      (s) => s.state.data,
      (data) => {
        if (onChange) {
          if (fdeq(data, previousData.current)) return;

          onChange(data as G["UserData"]);

          previousData.current = data;
        }
      }
    );
  }, [onChange]);

  useRegisterPermissionsSlice(appStore, permissions);

  useResolveDataOnMoved(appStore);

  const uPuckStore = useRegisterUsePuckStore(appStore);

  useEffect(() => {
    const { resolveAndCommitData } = appStore.getState();

    resolveAndCommitData();
  }, []);

  return (
    <appStoreContext.Provider value={appStore}>
      <UsePuckStoreContext.Provider value={uPuckStore}>
        {children}
      </UsePuckStoreContext.Provider>
    </appStoreContext.Provider>
  );
}

function PuckLayout<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>({ children }: PropsWithChildren) {
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
  useDeleteHotkeys();

  useEffect(() => {
    if (ready && iframe.enabled) {
      const frameDoc = getFrame();

      if (frameDoc) {
        return monitorHotkeys(frameDoc);
      }
    }
  }, [ready, iframe.enabled]);

  usePreviewModeHotkeys();

  const layoutOptions: Record<string, any> = {};

  if (leftWidth) {
    layoutOptions["--puck-user-left-side-bar-width"] = `${leftWidth}px`;
  }

  if (rightWidth) {
    layoutOptions["--puck-user-right-side-bar-width"] = `${rightWidth}px`;
  }

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
                  <Sidebar
                    position="left"
                    sidebarRef={leftSidebarRef}
                    isVisible={leftSideBarVisible}
                    onResize={setLeftWidth}
                    onResizeEnd={handleLeftSidebarResizeEnd}
                  >
                    <SidebarSection title="Components" noBorderTop>
                      <Components />
                    </SidebarSection>
                    <SidebarSection title="Outline">
                      <Outline />
                    </SidebarSection>
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
}

export function Puck<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>(props: PuckProps<UserConfig>) {
  return (
    <PropsProvider {...props}>
      <PuckProvider {...props}>
        <PuckLayout {...props} />
      </PuckProvider>
    </PropsProvider>
  );
}

Puck.Components = Components;
Puck.Fields = Fields;
Puck.Outline = Outline;
Puck.Preview = Preview;
