import {
  ComponentData,
  Config,
  Content,
  Data,
  DefaultComponentProps,
  DefaultRootFieldProps,
  Metadata,
  RootData,
} from "../types";
import { resolveComponentData } from "./resolve-component-data";
import { defaultData } from "./data/default-data";
import { toComponent } from "./data/to-component";
import { mapSlots } from "./data/map-slots";

export async function resolveAllData<
  Props extends DefaultComponentProps = DefaultComponentProps,
  RootProps extends Record<string, any> = DefaultRootFieldProps
>(
  data: Partial<Data>,
  config: Config,
  metadata: Metadata = {},
  onResolveStart?: (item: ComponentData) => void,
  onResolveEnd?: (item: ComponentData) => void
) {
  const defaultedData = defaultData(data);

  const resolveNode = async <T extends ComponentData | RootData>(_node: T) => {
    const node = toComponent(_node);

    onResolveStart?.(node);

    const resolved = (
      await resolveComponentData(
        node,
        config,
        metadata,
        () => {},
        () => {},
        "force"
      )
    ).node as T;

    const resolvedDeep = (await mapSlots(
      resolved,
      processContent,
      config
    )) as T;

    onResolveEnd?.(toComponent(resolvedDeep));

    return resolvedDeep;
  };

  const processContent = async (content: Content) => {
    return Promise.all(content.map(resolveNode));
  };

  const processZones = async () => {
    const zones = data.zones ?? {};

    Object.entries(zones).forEach(async ([zoneKey, content]) => {
      zones[zoneKey] = await Promise.all(content.map(resolveNode));
    });

    return zones;
  };

  const dynamic: Data = {
    root: await resolveNode(defaultedData.root),
    content: await processContent(defaultedData.content),
    zones: await processZones(),
  };

  Object.keys(defaultedData.zones ?? {}).forEach(async (zoneKey) => {
    const content = defaultedData.zones![zoneKey];
    dynamic.zones![zoneKey] = await processContent(content);
  }, {});

  return dynamic as Data<Props, RootProps>;
}
