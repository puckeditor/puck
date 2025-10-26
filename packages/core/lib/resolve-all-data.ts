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
import { resolveComponentData } from "./resolve-component-data";
import { groupZonesByComponent } from "./group-zones-by-component";
import { defaultData } from "./data/default-data";
import { toComponent } from "./data/to-component";
import { mapFields } from "./data/map-fields";

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

  let resolvedZones: Record<string, Content> = {};

  const resolveNode = async <T extends ComponentData | RootData>(
    _node: T,
    parent: ComponentData | null
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
        parent
      )
    ).node as T;

    const resolvedAsComponent = toComponent(resolved);

    // Resolve any slots recursively
    const resolvedDeepPromise = mapFields(
      resolved,
      {
        slot: ({ value }) => processContent(value, resolvedAsComponent),
      },
      config
    ) as unknown as Promise<T>;

    let resolveZonePromises: Promise<void>[] = [];

    // Resolve any zones recursively
    if (
      resolved.props &&
      "id" in resolved.props &&
      zonesByComponent[resolved.props?.id]
    ) {
      resolveZonePromises = zonesByComponent[resolved.props.id].map(
        async ({ zoneCompound, content }) => {
          resolvedZones[zoneCompound] = await processContent(
            content,
            resolvedAsComponent
          );
        }
      );
    }

    const resolvedDeep = await resolvedDeepPromise;
    await Promise.all(resolveZonePromises);

    onResolveEnd?.(toComponent(resolvedDeep));

    return resolvedDeepPromise;
  };

  const processContent = async (
    content: Content,
    parent: ComponentData | null
  ) => {
    return Promise.all(content.map((item) => resolveNode(item, parent)));
  };

  const result: Data = defaultData({});

  result.root = await resolveNode(defaultedData.root, null);
  result.content = await processContent(
    defaultedData.content,
    toComponent(result.root)
  );
  result.zones = resolvedZones;

  return result as Data<Components, RootProps>;
}
