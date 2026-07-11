/**
 * Type declarations for the Svelte-facing surface of @puckeditor/svelte (the
 * source layer resolved via the `svelte` export condition). Hand-written: the
 * compiled `dist/index.d.ts` types `Puck`/`Render`/`FieldLabel` as core's
 * *React* components, which is wrong for Svelte consumers — the declarations
 * here shadow them with the real Svelte components.
 */
import type { Component, Snippet } from "svelte";
import type {
  Data,
  Metadata,
  UiState,
  Permissions,
  Viewports,
  IframeConfig,
  InitialHistory,
  Plugin,
  Overrides,
  PuckProps,
  PuckApi,
  AppState,
  PuckAction,
  SvelteConfig,
  SvelteComponent,
  TransformConfigOptions,
} from "../dist/index.js";

/** Props shared by the slot/DropZone outlet components (mapped to core `DropZoneProps`; `class` → `className`). */
export interface PuckOutletProps {
  allow?: string[];
  disallow?: string[];
  minEmptyHeight?: number | string;
  collisionAxis?: "x" | "y" | "dynamic";
  class?: string;
  style?: string | Record<string, any>;
  [key: string]: any;
}

export interface SveltePuckProps {
  config: SvelteConfig;
  /** Initial-only, matching React `<Puck>`; later changes are ignored. */
  data: Partial<Data>;
  /** Initial-only. */
  ui?: Partial<UiState>;
  permissions?: Partial<Permissions>;
  viewports?: Viewports;
  iframe?: IframeConfig;
  dnd?: PuckProps["dnd"];
  /** Initial-only. */
  initialHistory?: InitialHistory;
  metadata?: Metadata;
  headerTitle?: string;
  headerPath?: string;
  height?: string | number;
  /** Advanced: Preact-based overrides, passed through to core. */
  overrides?: Partial<Overrides>;
  /** Advanced: Preact-based plugins, passed through to core. */
  plugins?: Plugin[];
  /** Advanced: Preact-based field transforms, passed through to core. */
  fieldTransforms?: PuckProps["fieldTransforms"];
  /** Svelte components replacing built-in field UIs, keyed by field type. */
  fieldTypes?: Record<string, SvelteComponent>;
  /**
   * Svelte context entries (`setContext`) threaded into every bridged Svelte
   * mount — the analogue of Vue's `app` prop. Read once at setup.
   */
  context?: Map<any, any> | null;
  onchange?: (data: Data) => void;
  onpublish?: (data: Data) => void;
  onaction?: (
    action: PuckAction,
    appState: AppState,
    prevAppState: AppState
  ) => void;
  /** Fired once when the editor is ready, with the imperative API accessor. */
  onready?: (getPuck: () => PuckApi) => void;
  _experimentalFullScreenCanvas?: boolean;
  _experimentalVirtualization?: boolean;
}

export interface SvelteRenderProps {
  config: SvelteConfig;
  data: Partial<Data>;
  metadata?: Metadata;
  /** Svelte context entries threaded into every bridged Svelte mount. */
  context?: Map<any, any> | null;
}

export interface FieldLabelProps {
  label?: string;
  el?: "label" | "div";
  readOnly?: boolean;
  icon?: Snippet;
  children?: Snippet;
}

/** The per-component Puck context returned by `getPuck()`. */
export interface SveltePuckContext {
  /** true inside `<Puck>`, false inside `<Render>`. */
  isEditing: boolean;
  /** merged Puck + component metadata. */
  metadata: Record<string, any>;
  /** this component instance's Puck id. */
  id?: string;
}

/** The full Puck editor, driven by a Svelte config. */
export declare const Puck: Component<SveltePuckProps>;

/** Renders published Puck data with Svelte config components. */
export declare const Render: Component<SvelteRenderProps>;

/** Outlet for a slot field: `<PuckSlot name="content" />`. */
export declare const PuckSlot: Component<PuckOutletProps & { name: string }>;

/** Outlet for a contentEditable/richtext field: `<PuckText name="title" />`. */
export declare const PuckText: Component<{ name: string }>;

/** Imperative DropZone outlet: `<PuckDropZone zone="my-zone" />`. */
export declare const PuckDropZone: Component<
  PuckOutletProps & { zone: string }
>;

/** Root-children outlet, for the config `root`'s render. */
export declare const PuckChildren: Component<Record<string, never>>;

/** FieldLabel with markup/CSS parity with core's, for custom Svelte fields. */
export declare const FieldLabel: Component<FieldLabelProps>;

/**
 * Read the current component's reactive Puck context (`{ isEditing, metadata,
 * id }`) from within a bridged Svelte component.
 */
export declare function getPuck(): SveltePuckContext;

/**
 * Reactively subscribe to the editor's `PuckApi` — the Svelte equivalent of
 * React's selector-based `usePuck`. Call during component init; returns
 * `{ current }`, updated whenever the selected value changes (by identity).
 * Only available inside `<Puck>`.
 */
export declare function puckApi(): { readonly current: PuckApi | undefined };
export declare function puckApi<T>(
  selector: (api: PuckApi) => T
): { readonly current: T | undefined };

// Everything else — transformConfig, defineSvelteComponent/Field, core's
// framework-agnostic utilities (migrate, walkTree, resolveAllData, ...) and
// all types. NOTE: this also surfaces core's Preact-compiled components
// (Drawer, AutoField, DropZone, React hooks, ...), which are usable only from
// Preact-based `overrides`/`plugins` code — not from Svelte templates. The
// local declarations above shadow `Puck`/`Render`/`FieldLabel`.
export * from "../dist/index.js";
export type { TransformConfigOptions };
