import {
  ComponentData,
  Config,
  Content,
  Metadata,
  ResolveDataTrigger,
  RootDataWithProps,
} from "../types";
import { mapFields } from "./data/map-fields";
import { getChanged } from "./get-changed";
import { deepEqual } from "fast-equals";

export const cache: {
  lastChange: Record<string, any>;
} = { lastChange: {} };

export const resolveComponentData = async <
  T extends ComponentData | RootDataWithProps
>(
  item: T,
  config: Config,
  metadata: Metadata = {},
  onResolveStart?: (item: T) => void,
  onResolveEnd?: (item: T) => void,
  trigger: ResolveDataTrigger = "replace"
) => {
  const configForItem =
    "type" in item && item.type !== "root"
      ? config.components[item.type]
      : config.root;

  const resolvedItem: T = {
    ...item,
  };

  const shouldRunResolver = configForItem?.resolveData && item.props;

  const id = "id" in item.props ? item.props.id : "root";

  if (shouldRunResolver) {
    const { item: oldItem = null, resolved = {} } = cache.lastChange[id] || {};

    if (trigger !== "force" && item && deepEqual(item, oldItem)) {
      return { node: resolved, didChange: false };
    }

    const changed = getChanged(item, oldItem) as any;

    if (onResolveStart) {
      onResolveStart(item);
    }

    const { props: resolvedProps, readOnly = {} } =
      await configForItem.resolveData!(item, {
        changed,
        lastData: oldItem,
        metadata: { ...metadata, ...configForItem.metadata },
        trigger,
      });

    resolvedItem.props = {
      ...item.props,
      ...resolvedProps,
    };

    if (Object.keys(readOnly).length) {
      resolvedItem.readOnly = readOnly;
    }
  }

  let itemWithResolvedChildren = await mapFields(
    resolvedItem,
    {
      slot: async ({ value }) => {
        const content = value as Content;

        return await Promise.all(
          content.map(
            async (childItem) =>
              (
                await resolveComponentData(
                  childItem as T,
                  config,
                  metadata,
                  onResolveStart,
                  onResolveEnd,
                  trigger
                )
              ).node
          )
        );
      },
    },
    config
  );

  if (shouldRunResolver && onResolveEnd) {
    onResolveEnd(resolvedItem);
  }

  cache.lastChange[id] = {
    item: item,
    resolved: itemWithResolvedChildren,
  };

  return {
    node: itemWithResolvedChildren,
    didChange: !deepEqual(item, itemWithResolvedChildren),
  };
};
