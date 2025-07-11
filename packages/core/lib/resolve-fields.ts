import {
  AppState,
  ComponentData,
  Config,
  Fields,
  Metadata,
  ResolverTrigger,
  RootDataWithProps,
} from "../types";
import { mapSlots } from "./data/map-slots";
import { getChanged } from "./get-changed";
import fdeq from "fast-deep-equal";
import { getConfig } from "./get-config";
import { AppStore } from "../store";
import { makeStatePublic } from "./data/make-state-public";
import { PrivateAppState } from "../types/Internal";

export const cache: {
  lastChange: Record<string, any>;
} = { lastChange: {} };

export const resolveFields = async <
  T extends ComponentData | RootDataWithProps,
  ReturnType extends {
    data: Fields<T["props"]> | undefined;
    didChange: boolean;
  }
>(
  item: T,
  config: Config,
  state: PrivateAppState,
  metadata: Metadata = {},
  onResolveStart?: (item: T) => void,
  onResolveEnd?: (item: T, fields: ReturnType) => void,
  trigger: ResolverTrigger = "replace"
): Promise<ReturnType> => {
  const parentId = state.indexes.nodes[item.props.id]?.parentId;
  const parent = parentId ? state.indexes.nodes[parentId].data : null;
  const configForItem = getConfig(item, config);

  let newFields = configForItem?.fields;

  const shouldRunResolver = configForItem?.resolveFields && item.props;

  const id = "id" in item.props ? item.props.id : "root";

  if (shouldRunResolver) {
    const { item: oldItem = null, resolved = {} } = cache.lastChange[id] || {};

    if (item && fdeq(item, oldItem)) {
      return { data: resolved, didChange: false } as ReturnType;
    }

    const changed = getChanged(item, oldItem) as any;

    if (onResolveStart) {
      onResolveStart(item);
    }

    newFields = await configForItem.resolveFields!(item, {
      changed,
      lastData: oldItem,
      fields: configForItem.fields ?? {},
      lastFields: resolved,
      appState: makeStatePublic(state),
      parent,
      // TODO implement for consistency
      // metadata: { ...metadata, ...configForItem.metadata },
      // trigger,
    });
  }

  await mapSlots(
    item,
    async (content, parentId) => {
      await Promise.all(
        content.map(
          async (childItem) =>
            (
              await resolveFields(
                childItem as T,
                config,
                state,
                metadata,
                onResolveStart,
                onResolveEnd,
                trigger
              )
            ).data
        )
      );
      return content;
    },

    config
  );

  const didChange = !fdeq(cache.lastChange[id]?.resolved, newFields);

  const response = {
    data: newFields,
    didChange,
  } as ReturnType;

  if (shouldRunResolver && onResolveEnd) {
    onResolveEnd(item, response);
  }

  cache.lastChange[id] = {
    item: item,
    resolved: newFields,
  };

  return {
    data: newFields,
    didChange,
  } as ReturnType;
};
