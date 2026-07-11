import type { SlotRegistry } from "./registry";
import type { Split } from "./split-props";

/**
 * A mounted framework component instance, controlled by the shared bridge. The
 * bridge calls `patch` on every commit after the first and `unmount` on
 * teardown; the adapter owns whatever framework reactivity/root that entails.
 *
 * `TNext` is the patch payload: a `Split` for components, a plain props object
 * for fields.
 */
export type MountedInstance<TNext = any> = {
  /** Reconcile the mount toward the next props/context. */
  patch: (next: TNext) => void;
  /** Tear down the framework root (runs before Preact removes the host div). */
  unmount: () => void;
};

/** Arguments the bridge hands the adapter to mount a config component. */
export type ComponentMountArgs = {
  /** The host `<div>` the framework should mount into. */
  el: HTMLElement;
  /** The user's framework component (opaque to the shim). */
  comp: unknown;
  /** Props + puck context, already decorated with outlets by the adapter. */
  split: Split;
  /** The bridge-owned registry — context-based adapters (Svelte) hand this to the component. */
  registry: SlotRegistry;
  slotPropNames: string[];
  /** True when wrapping the config root (bridges `children`). */
  isRoot: boolean;
};

/** Arguments the bridge hands the adapter to mount a custom field. */
export type FieldMountArgs = {
  el: HTMLElement;
  comp: unknown;
  /** Field props, already decorated (e.g. `children` outlet) by the adapter. */
  props: Record<string, any>;
  registry: SlotRegistry;
  /**
   * The editor's PuckApi zustand store, for the framework's reactive
   * editor-state accessor inside field UIs. Identity-stable.
   */
  storeApi?: unknown;
};

export type DecorateComponentCtx = {
  /** Outlet components keyed by thunkKey (empty for context-based adapters). */
  outlets: Record<string, unknown>;
  slotPropNames: string[];
  isRoot: boolean;
};

export type DecorateFieldCtx = {
  /** The children outlet component, if the adapter created one. */
  outlet: unknown;
  /** True when core passed `children` (a fieldTypes override wrapping the default UI). */
  hasChildren: boolean;
};

/**
 * The framework-specific seam. Everything in the shim is generic Preact
 * machinery; an adapter supplies the ~framework-bound calls: how to mount a
 * component/field and reconcile it, how to mint slot outlets, and how outlets
 * are threaded into props.
 *
 * Adapters come in two modes:
 *  - **outlet-minting** (Vue): implements `createOutlet` +
 *    `decorateComponentSplit`/`decorateFieldProps` — slot outlets are
 *    framework component *values* injected into the component's props
 *    (`<component :is="content" />`).
 *  - **context-based** (Svelte): omits those hooks and instead hands the
 *    bridge-owned `registry` (from the mount args) to the component via the
 *    framework's context, where package-provided outlet components
 *    (`<PuckSlot name>`) register their elements.
 */
export type FrameworkAdapter = {
  mountComponent: (args: ComponentMountArgs) => MountedInstance<Split>;
  mountField: (args: FieldMountArgs) => MountedInstance<Record<string, any>>;
  /**
   * Create an outlet component bound to (registry, thunkKey). Absent for
   * context-based frameworks (Svelte), which register outlets from a
   * context-provided registry instead.
   */
  createOutlet?: (registry: SlotRegistry, thunkKey: string) => unknown;
  /**
   * Inject outlet components into a component's split before mount/patch (Vue's
   * `<component :is>` model). Absent for context-based frameworks.
   */
  decorateComponentSplit?: (split: Split, ctx: DecorateComponentCtx) => void;
  /** Inject the children outlet into a field's props before mount/patch. */
  decorateFieldProps?: (
    props: Record<string, any>,
    ctx: DecorateFieldCtx
  ) => void;
};
