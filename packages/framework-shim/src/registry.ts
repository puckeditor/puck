/**
 * The slot/DropZone outlet registry protocol — the framework-agnostic half of
 * the outlet bridge. A framework-owned DOM element registers here; the Preact
 * bridge renders a portal per registered mount and pipes the slot's
 * (Preact-rendered) content into it. Backed by Preact state (via
 * `createSlotRegistry`) so registering triggers a re-render that commits the
 * portals.
 *
 * How outlets are minted and how their elements get registered is
 * framework-specific (Vue: an `<component :is>` outlet component; Svelte: a
 * `<PuckSlot>` reading the registry from context) — that lives in each
 * framework package. This module owns only the shared registry shape, the uid
 * sequence, and the reserved thunk keys.
 */

/**
 * A registered slot/DropZone outlet: a framework-owned DOM element into which
 * the Preact bridge portals the slot's (Preact-rendered) content.
 */
export type SlotMount = {
  uid: number;
  /** Which thunk (slot prop name, or a reserved key) fills this outlet. */
  thunkKey: string;
  el: HTMLElement;
  /** DropZoneProps derived from the outlet's attrs (allow, disallow, zone…). */
  dzProps: Record<string, any>;
};

/**
 * Bridge registry: framework outlets register their elements here; the Preact
 * side renders a portal per registered mount.
 */
export type SlotRegistry = {
  register: (mount: SlotMount) => void;
  update: (uid: number, dzProps: Record<string, any>) => void;
  unregister: (uid: number) => void;
};

let uidSeq = 0;
export const nextUid = () => (uidSeq += 1);

/**
 * Build a `SlotRegistry` backed by a Preact `setMounts` updater. Registering /
 * updating / unregistering mutates the bridge's `mounts` state, triggering the
 * re-render that (re)commits the portals.
 */
export const createSlotRegistry = (
  setMounts: (updater: (prev: SlotMount[]) => SlotMount[]) => void
): SlotRegistry => ({
  register: (m) => setMounts((prev) => [...prev, m]),
  update: (uid, dzProps) =>
    setMounts((prev) =>
      prev.map((m) => (m.uid === uid ? { ...m, dzProps } : m))
    ),
  unregister: (uid) => setMounts((prev) => prev.filter((m) => m.uid !== uid)),
});

/**
 * Map a framework outlet's attrs/props to core `DropZoneProps`: the
 * framework's `class` → React's `className`; everything else (allow,
 * disallow, zone, minEmptyHeight, collisionAxis, style, …) passes through.
 */
export const mapDropZoneProps = (
  attrs: Record<string, any>
): Record<string, any> => {
  const { class: className, ...rest } = attrs;
  const dzProps: Record<string, any> = { ...rest };
  if (className != null) dzProps.className = className;
  return dzProps;
};

/** Reserved thunk keys for non-field slots. */
export const RENDER_DROPZONE_KEY = "__puck_render_dropzone";
export const CHILDREN_KEY = "__puck_children";
