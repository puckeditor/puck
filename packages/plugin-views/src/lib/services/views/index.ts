import { ComponentData, RootData, Metadata } from "@puckeditor/core";

import {
  BuiltInView,
  ResolvedView,
  ViewSources,
  ViewsPluginOptions,
  ViewsStorage,
} from "../../../types";

import { DEFAULT_STORAGE_KEY } from "../../constants";
import { toRootComponent } from "../../puck/to-root-component";
import { normalizeRootData } from "../../puck/normalize-root-data";

import { sanitizeId } from "../../utils/sanitize-id";

const inFlightQueries = new Map<string, Promise<any>>();

/**
 * Sets the user-defined views on the root component.
 *
 * @param options The root data, the key to store the views under, and the object with the custom views
 * @returns The updated root data
 */
export const setViews = ({
  root,
  storageKey = DEFAULT_STORAGE_KEY,
  storage,
}: {
  root: RootData;
  storageKey?: string;
  storage: ViewsStorage;
}) => {
  const normalized = normalizeRootData(root);

  return {
    ...root,
    props: {
      ...normalized.props,
      [storageKey]: storage,
    },
  };
};

/**
 * Gets the user-defined views stored from the root component.
 *
 * @param options The root data and the storage key where the views are stored
 * @returns The views storage object
 */
export const getCustomViews = ({
  root,
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  root?: RootData | ComponentData | null;
  storageKey?: string;
}): ViewsStorage => {
  const rootComponent = toRootComponent(root);
  const raw = rootComponent?.props?.[storageKey];

  if (!raw || typeof raw !== "object") {
    return { custom: [] };
  }

  return {
    custom: Array.isArray((raw as ViewsStorage).custom)
      ? (raw as ViewsStorage).custom.map((item) => ({
          id: item.id,
          label: item.label,
          source: item.source,
          params:
            item.params && typeof item.params === "object" ? item.params : {},
        }))
      : [],
  };
};

/**
 * Creates the cache key used to deduplicate in-flight view data fetches.
 *
 * @param view The view being fetched
 * @returns The cache key for that view request
 */
const getQueryCacheKey = (
  view: Pick<ResolvedView, "id" | "source" | "params">
) =>
  JSON.stringify({
    viewId: view.id,
    source: view.source,
    params: view.params ?? {},
  });

/**
 * Clears the in-memory cache of in-flight view data fetches.
 */
export const clearQueryCache = () => {
  inFlightQueries.clear();
};

/**
 * Fetches data for the view, deduplicating concurrent requests.
 *
 * @param options The view, sources, Puck metadata, and root data
 * @returns The fetched view data
 */
export const getViewData = async ({
  view,
  sources,
  metadata,
  root,
}: {
  view: Pick<ResolvedView, "id" | "source" | "params">;
  sources: ViewSources;
  metadata?: Metadata;
  root: ComponentData | null;
}) => {
  const source = sources[view.source];

  if (!source) {
    throw new Error(`View source "${view.source}" does not exist`);
  }

  const key = getQueryCacheKey(view);

  if (!inFlightQueries.has(key)) {
    const request = Promise.resolve(
      source.fetch(view.params ?? {}, {
        metadata,
        root,
        viewId: view.id,
      })
    ).finally(() => {
      inFlightQueries.delete(key);
    });

    inFlightQueries.set(key, request);
  }

  return inFlightQueries.get(key)!;
};

/**
 * Gets a list of all views defined in the page
 *
 * @param options The root data, built-in views, and the key where user made views are stored on the root props
 * @returns All the views defined in the page
 */
export const getViews = ({
  root,
  builtInViews = [],
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  root?: RootData | ComponentData | null;
  builtInViews?: BuiltInView[];
  storageKey?: string;
}): ResolvedView[] => {
  const customViews = getCustomViews({ root, storageKey });

  return [
    ...builtInViews.map((view) => ({
      id: view.id,
      label: view.label,
      source: view.source,
      params: view.params ?? {},
      builtIn: true,
    })),
    ...customViews.custom.map((view) => ({
      ...view,
      params: view.params ?? {},
    })),
  ];
};

/**
 * Gets the views with the given IDs ones passed in.
 *
 * @param views The views from which to select
 * @param viewIds The IDs of the views to select, or all if not provided
 * @returns The selected views, or null if any requested ID is missing from the array
 */
const getViewsById = ({
  views,
  viewIds,
}: {
  views: ResolvedView[];
  viewIds?: string[];
}) => {
  if (!viewIds) {
    return views;
  }

  const selectedViews: ResolvedView[] = [];
  const resolvedViewsById = new Map(
    views.map((view) => [view.id, view] as const)
  );

  const uniqueViewIds = new Set(viewIds);

  for (const viewId of uniqueViewIds) {
    const view = resolvedViewsById.get(viewId);

    if (!view) {
      return null;
    }

    selectedViews.push(view);
  }

  return selectedViews;
};

/**
 * Loads view data for all views or only the ones with the given IDs.
 *
 * @param options The root, metadata, plugin options, and optional view IDs
 * @returns The loaded view data keyed by view ID, or null if a view with the given IDs is missing
 */
export const getViewDataByIds = async ({
  root,
  metadata,
  options,
  viewIds,
}: {
  root?: RootData | ComponentData | null;
  metadata?: Metadata;
  options: Pick<ViewsPluginOptions, "builtInViews" | "sources" | "storageKey">;
  viewIds?: string[];
}): Promise<Record<string, any> | null> => {
  const rootComponent = toRootComponent(root);

  const allViews = getViews({
    root: rootComponent,
    builtInViews: options.builtInViews,
    storageKey: options.storageKey,
  });

  const viewsToLoad = getViewsById({
    views: allViews,
    viewIds,
  });

  if (!viewsToLoad) {
    return null;
  }

  const viewEntries = await Promise.all(
    viewsToLoad.map(
      async (view) =>
        [
          view.id,
          await getViewData({
            view,
            sources: options.sources,
            metadata,
            root: rootComponent,
          }),
        ] as const
    )
  );

  return Object.fromEntries(viewEntries);
};

/**
 * Creates a unique custom view ID from a label or source.
 *
 * @param options The existing IDs and source values to derive from
 * @returns A unique view ID
 */
export const createViewId = ({
  existingIds,
  label,
  source,
}: {
  existingIds: string[];
  label?: string;
  source?: string;
}) => {
  const base =
    sanitizeId(label || source || "", {
      preserveUnderscores: false,
    }) || "view";

  if (!existingIds.includes(base)) {
    return base;
  }

  let counter = 2;

  while (existingIds.includes(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
};
