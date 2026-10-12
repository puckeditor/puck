import type { PathSegment } from "../ast/puck-fields";

/** Where each component's switched fields are, keyed by component ("root" for root) */
export type AssetPaths = Record<string, PathSegment[][]>;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A component in Puck data, e.g. in content, a zone or a slot */
const isComponent = (value: unknown): value is { type: string; props: Json } =>
  isObject(value) && typeof value.type === "string" && isObject(value.props);

/**
 * Turns the value at `path` into an asset: "url" becomes { src: "url" } and
 * "" is removed. Objects are left alone, so running it again changes nothing.
 * Returns how many values changed.
 */
const migrateAt = (holder: Json, path: PathSegment[]): number => {
  const [segment, ...rest] = path;
  const value = holder[segment.key];

  if (!rest.length) {
    if (typeof value !== "string") return 0;
    if (value === "") delete holder[segment.key];
    else holder[segment.key] = { src: value };
    return 1;
  }

  if (segment.array) {
    if (!Array.isArray(value)) return 0;
    return value.reduce<number>(
      (n, item) => n + (isObject(item) ? migrateAt(item, rest) : 0),
      0
    );
  }
  return isObject(value) ? migrateAt(value, rest) : 0;
};

/**
 * Migrates one page's Puck data in place: root, content, zones, and
 * components in slots. Returns how many values changed.
 */
export const migratePageData = (data: unknown, paths: AssetPaths): number => {
  if (!isObject(data)) return 0;
  let changed = 0;

  const visitComponent = (component: { type: string; props: Json }) => {
    for (const path of paths[component.type] ?? [])
      changed += migrateAt(component.props, path);
    visitSlots(component.props);
  };

  // Slots are props holding lists of components, anywhere in the props
  const visitSlots = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isComponent(item)) visitComponent(item);
        else visitSlots(item);
      }
    } else if (isObject(value)) {
      for (const child of Object.values(value)) visitSlots(child);
    }
  };

  if (isObject(data.root)) {
    // Older data keeps root props on root itself
    const root = isObject(data.root.props) ? data.root.props : data.root;
    for (const path of paths.root ?? []) changed += migrateAt(root, path);
  }
  if (Array.isArray(data.content)) visitSlots(data.content);
  if (isObject(data.zones)) {
    for (const zone of Object.values(data.zones)) visitSlots(zone);
  }

  return changed;
};

/**
 * Paths for the chosen fields that held a URL, or already use assetField()
 * and may still have URLs saved. { src } objects need no change.
 */
export const assetPaths = (
  fields: { component: string; path: PathSegment[]; shape: string | null }[]
): AssetPaths => {
  const paths: AssetPaths = {};
  for (const field of fields) {
    if (field.shape !== "string" && field.shape !== "asset") continue;
    (paths[field.component] ??= []).push(field.path);
  }
  return paths;
};
