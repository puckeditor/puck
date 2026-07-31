import type { Draggable } from "@dnd-kit/abstract";
import type { StoreApi } from "zustand";
import { Config } from "../../../../types";
import { NodeIndex, ZoneIndex } from "../../../../types/Internal";
import { isComponentAllowed } from "../../../../lib/data/is-component-allowed";
import { getZoneConstraints } from "../../../../lib/data/resolve-zone-constraints";
import type { useAppStoreApi } from "../../../../store";
import type { OutlineDndStore } from "../store";

export const OUTLINE_ITEM_TYPE = "outline-item";
export const OUTLINE_ZONE_TYPE = "outline-zone";

export type OutlineRowDndData = {
  kind: "row";
  itemId: string;
  zoneCompound: string;
  index: number;
  componentType: string;
};

export type OutlineZoneDndData = {
  kind: "zone";
  zoneCompound: string;
};

export type OutlineDndData = OutlineRowDndData | OutlineZoneDndData;

export type OutlineIndexes = { nodes: NodeIndex; zones: ZoneIndex };
export type OutlineAcceptCache = Map<string, boolean>;

const cached = (
  cache: OutlineAcceptCache,
  key: string,
  compute: () => boolean
) => {
  const hit = cache.get(key);

  if (hit !== undefined) {
    return hit;
  }

  const result = compute();
  cache.set(key, result);

  return result;
};

/**
 * Returns whether a zone compound's zone accepts a component type per config constraints.
 *
 * NB: This only works with slots that define allow/disallow constraints in the config.
 */
export const zoneAcceptsComponent = (
  cache: OutlineAcceptCache,
  zoneCompound: string,
  componentType: string,
  config: Config,
  indexes: OutlineIndexes
) =>
  cached(cache, `zone:${zoneCompound}`, () => {
    const targetZoneConstraints = getZoneConstraints(
      zoneCompound,
      config,
      indexes
    );

    return isComponentAllowed(componentType, targetZoneConstraints);
  });

/** Whether any of the item's zones accepts the dragged type */
export const itemAcceptsComponent = (
  cache: OutlineAcceptCache,
  itemId: string,
  componentType: string,
  config: Config,
  indexes: OutlineIndexes
) =>
  cached(cache, `childZones:${itemId}`, () => {
    return Object.keys(indexes.zones).some(
      (zoneCompound) =>
        zoneCompound.startsWith(`${itemId}:`) &&
        zoneAcceptsComponent(
          cache,
          zoneCompound,
          componentType,
          config,
          indexes
        )
    );
  });

/**
 * Whether an item is the dragged item or inside its subtree. Same mechanism
 * as the canvas: an ancestor appearing in the item's indexed path.
 */
export const isSourceOrDescendantOfSource = (
  cache: OutlineAcceptCache,
  itemId: string,
  sourceItemId: string,
  nodes: NodeIndex
) =>
  cached(cache, `subtree:${itemId}`, () => {
    if (itemId === sourceItemId) {
      return true;
    }

    const path = nodes[itemId]?.path || [];

    return path.some(
      (zoneCompound) => zoneCompound.split(":")[0] === sourceItemId
    );
  });

export type OutlineAcceptTarget =
  | { kind: "row"; itemId: string; zoneCompound: string }
  | { kind: "zone"; zoneCompound: string };

/**
 * Builds the accept callback for an outline drop target. Every target kind
 * shares the same safety rails: only outline rows are accepted, and nothing
 * inside the dragged item's own subtree can receive it.
 */
export const createOutlineAccept =
  (
    stores: {
      appStore: ReturnType<typeof useAppStoreApi>;
      outlineStore: StoreApi<OutlineDndStore>;
    },
    target: OutlineAcceptTarget
  ) =>
  (source: Draggable): boolean => {
    if (source.type !== OUTLINE_ITEM_TYPE) return false;

    const sourceData = source.data as OutlineRowDndData;
    const cache = stores.outlineStore.getState().acceptCache;
    const { config, state } = stores.appStore.getState();
    const indexes = state.indexes;

    const anchorId =
      target.kind === "row" ? target.itemId : target.zoneCompound.split(":")[0];

    if (
      isSourceOrDescendantOfSource(
        cache,
        anchorId,
        sourceData.itemId,
        indexes.nodes
      )
    ) {
      return false;
    }

    if (target.kind === "zone") {
      return zoneAcceptsComponent(
        cache,
        target.zoneCompound,
        sourceData.componentType,
        config,
        indexes
      );
    }

    // A row is a target if items can drop beside it, or if hovering it could
    // expand a child zone that accepts them
    return (
      zoneAcceptsComponent(
        cache,
        target.zoneCompound,
        sourceData.componentType,
        config,
        indexes
      ) ||
      itemAcceptsComponent(
        cache,
        target.itemId,
        sourceData.componentType,
        config,
        indexes
      )
    );
  };
