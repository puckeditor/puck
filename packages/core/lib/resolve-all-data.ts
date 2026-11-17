import {
  ComponentData,
  Config,
  Content,
  Data,
  DefaultComponents,
  DefaultRootFieldProps,
  Metadata,
  RootData,
} from "../types";
import {
  ResolveDataCache,
  resolveComponentData,
} from "./resolve-component-data";
import { groupZonesByComponent } from "./group-zones-by-component";
import { defaultData } from "./data/default-data";
import { toComponent } from "./data/to-component";

export async function resolveAllData<
  Components extends DefaultComponents = DefaultComponents,
  RootProps extends Record<string, any> = DefaultRootFieldProps
>(
  data: Partial<Data>,
  config: Config,
  metadata: Metadata = {},
  onResolveStart?: (item: ComponentData) => void,
  onResolveEnd?: (item: ComponentData) => void
) {
  const defaultedData = defaultData(data);

  const zonesByComponent = groupZonesByComponent(defaultedData);

  // Use a local cache so entries are garbage collected when this function
  // returns, rather than accumulating in the shared module-level cache. This
  // prevents unbounded memory growth when resolving many pages with unique
  // component IDs.
  const cacheStore: ResolveDataCache = { lastChange: {} };

  let resolvedZones: Record<string, Content> = {};

  const resolveNode = async <T extends ComponentData | RootData>(
    _node: T,
    parent: ComponentData | null,
    root: RootData
  ) => {
    const node = toComponent(_node);

    onResolveStart?.(node);

    const resolved = (
      await resolveComponentData(
        node,
        config,
        metadata,
        () => {},
        () => {},
        "force",
        parent,
        root,
        cacheStore,
        // Slot children resolve through resolveNode, not a second walk of
        // the resolved tree, so each resolveData runs once.
        (child, resolvedParent) => resolveNode(child, resolvedParent, root)
      )
    ).node as T;

    const resolvedAsComponent = toComponent(resolved);

    let resolveZonePromises: Promise<void>[] = [];

    // Resolve any zones concurrently
    if (zonesByComponent[resolvedAsComponent.props.id]) {
      resolveZonePromises = zonesByComponent[resolvedAsComponent.props.id].map(
        async ({ zoneCompound, content }) => {
          resolvedZones[zoneCompound] = await processContent(
            content,
            resolvedAsComponent,
            root
          );
        }
      );
    }

    await Promise.all(resolveZonePromises);

    onResolveEnd?.(resolvedAsComponent);

    return resolved;
  };

  const processContent = async (
    content: Content,
    parent: ComponentData | null,
    root: RootData
  ) => {
    return Promise.all(content.map((item) => resolveNode(item, parent, root)));
  };

  const result: Data = defaultData({});

  result.root = await resolveNode(defaultedData.root, null, defaultedData.root);
  result.content = await processContent(
    defaultedData.content,
    toComponent(result.root),
    result.root
  );
  result.zones = resolvedZones;

  return result as Data<Components, RootProps>;
}
