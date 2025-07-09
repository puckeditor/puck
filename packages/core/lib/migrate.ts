import { defaultAppState } from "../store/default-app-state";
import { ComponentData, Config, Data } from "../types";
import { walkAppState } from "./data/walk-app-state";

type Migration = (
  props: Data & { [key: string]: any },
  config?: Config
) => Data;

const migrations: Migration[] = [
  // Migrate root to root.props
  (data) => {
    const rootProps = data.root.props || data.root;

    if (Object.keys(data.root).length > 0 && !data.root.props) {
      console.warn(
        "Migration applied: Root props moved from `root` to `root.props`."
      );

      return {
        ...data,
        root: {
          props: {
            ...rootProps,
          },
        },
      };
    }

    return data;
  },

  // Migrate zones to slots
  (data, config) => {
    if (!config) return data;

    console.log("Migrating DropZones to slots...");

    const updatedItems: Record<string, ComponentData> = {};
    const appState = { ...defaultAppState, data };
    const { indexes } = walkAppState(appState, config);

    const deletedCompounds: string[] = [];

    walkAppState(appState, config, (content, zoneCompound, zoneType) => {
      if (zoneType === "dropzone") {
        const [id, slotName] = zoneCompound.split(":");

        const nodeData = indexes.nodes[id].data;
        const componentType = nodeData.type;

        const configForComponent =
          id === "root" ? config.root : config.components[componentType];

        if (configForComponent?.fields?.[slotName]?.type === "slot") {
          // Migrate this to slot
          updatedItems[id] = {
            ...nodeData,
            props: {
              ...nodeData.props,
              ...updatedItems[id]?.props,
              [slotName]: content,
            },
          };

          deletedCompounds.push(zoneCompound);
        }

        return content;
      }

      return content;
    });

    const updated = walkAppState(
      appState,
      config,
      (content) => content,
      (item) => {
        return updatedItems[item.props.id] ?? item;
      }
    );

    deletedCompounds.forEach((zoneCompound) => {
      const [_, propName] = zoneCompound.split(":");
      console.log(
        `✓ Success: Migrated "${zoneCompound}" from DropZone to slot field "${propName}"`
      );
      delete updated.data.zones?.[zoneCompound];
    });

    Object.keys(updated.data.zones ?? {}).forEach((zoneCompound) => {
      const [_, propName] = zoneCompound.split(":");

      throw new Error(
        `Could not migrate DropZone "${zoneCompound}" to slot field. No slot exists with the name "${propName}".`
      );
    });

    delete updated.data.zones;

    return updated.data;
  },
];

export function migrate(data: Data, config?: Config): Data {
  return migrations?.reduce(
    (acc, migration) => migration(acc, config),
    data
  ) as Data;
}
