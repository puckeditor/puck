/* eslint-disable react-hooks/rules-of-hooks */
import {
  Context,
  createContext,
  CSSProperties,
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
  ComponentData,
} from "../../types";

import { PuckAction } from "../../reducer";
import { createAppStore, defaultAppState, appStoreContext } from "../../store";
import { Fields } from "./components/Fields";
import { Components } from "./components/Components";
import { Preview } from "./components/Preview";
import { Outline } from "./components/Outline";
import { defaultViewports } from "../ViewportControls/default-viewports";
import { Viewports } from "../../types";
import { useLoadedOverrides } from "../../lib/use-loaded-overrides";
import { useRegisterHistorySlice } from "../../store/slices/history";
import { useRegisterPermissionsSlice } from "../../store/slices/permissions";
import {
  UsePuckStoreContext,
  useRegisterUsePuckStore,
} from "../../lib/use-puck";
import { walkAppState } from "../../lib/data/walk-app-state";
import { PrivateAppState } from "../../types/Internal";
import fdeq from "fast-deep-equal";
import { FieldTransforms } from "../../types/API/FieldTransforms";
import { populateIds } from "../../lib/data/populate-ids";
import { toComponent } from "../../lib/data/to-component";
import { Layout } from "./components/Layout";
import { useSafeId } from "../../lib/use-safe-id";

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
  height?: CSSProperties["height"];
  _experimentalFullScreenCanvas?: boolean;
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

      const fullWidthViewport = Object.values(viewports).find(
        (v) => v.width === "100%"
      );

      const containsFullWidthViewport = !!fullWidthViewport;

      const viewportDifferences = Object.entries(viewports)
        .filter(([_, value]) => value.width !== "100%")
        .map(([key, value]) => ({
          key,
          diff: Math.abs(
            viewportWidth -
              (typeof value.width === "string" ? viewportWidth : value.width)
          ),
          value,
        }))
        .sort((a, b) => (a.diff > b.diff ? 1 : -1));

      let closestViewport = viewportDifferences[0].value;

      // Select full width viewport if it exists, and the closest viewport is smaller than the window
      if (
        (closestViewport.width as number) < viewportWidth &&
        containsFullWidthViewport
      ) {
        closestViewport = fullWidthViewport;
      }

      if (iframe.enabled) {
        clientUiState = {
          ...clientUiState,
          viewports: {
            ...initial.viewports,

            current: {
              ...initial.viewports.current,
              height:
                initialUi?.viewports?.current?.height ||
                closestViewport?.height ||
                "auto",
              width:
                initialUi?.viewports?.current?.width || closestViewport?.width,
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

  const initialHistoryIndex = useMemo(() => {
    if (
      _initialHistory?.index !== undefined &&
      _initialHistory?.index >= 0 &&
      _initialHistory?.index < blendedHistories.length
    ) {
      return _initialHistory?.index;
    }

    return blendedHistories.length - 1;
  }, []);
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

  const instanceId = useSafeId();

  const generateAppStore = useCallback(
    (state?: PrivateAppState) => {
      return {
        instanceId,
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
      instanceId,
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

export function Puck<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>(props: PuckProps<UserConfig>) {
  return (
    <PropsProvider {...props}>
      <PuckProvider {...props}>
        <Layout>{props.children}</Layout>
      </PuckProvider>
    </PropsProvider>
  );
}

Puck.Components = Components;
Puck.Fields = Fields;
Puck.Outline = Outline;
Puck.Preview = Preview;
