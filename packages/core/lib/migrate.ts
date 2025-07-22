import { defaultAppState } from "../store/default-app-state";
import type {
  ComponentData,
  Config,
  Content,
  Data,
  UserGenerics,
  WithId,
} from "../types";
import { walkAppState } from "./data/walk-app-state";
import { walkTree } from "./data/walk-tree";

type MigrationOptions<UserConfig extends Config> = {
  migrateDynamicZonesForComponent?: {
    [ComponentName in keyof UserConfig["components"]]: (
      props: WithId<UserGenerics<UserConfig>["UserProps"][ComponentName]>,
      zones: Record<string, Content>
    ) => ComponentData["props"];
  };
};

type Migration = (
  props: Data & { [key: string]: any },
  config?: Config,
  migrationOptions?: MigrationOptions<Config>
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
  (data, config, migrationOptions) => {
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

    // Migrate zones created by dynamic arrays
    if (migrationOptions?.migrateDynamicZonesForComponent) {
      const unmigratedZonesGrouped: Record<
        string,
        Record<string, Content>
      > = {};

      Object.keys(updated.data.zones ?? {}).forEach((zoneCompound) => {
        const [componentId, propName] = zoneCompound.split(":");
        const content = updated.data.zones?.[zoneCompound];

        if (!content) {
          return;
        }

        if (!unmigratedZonesGrouped[componentId]) {
          unmigratedZonesGrouped[componentId] = {};
        }

        if (!unmigratedZonesGrouped[componentId][propName]) {
          unmigratedZonesGrouped[componentId][propName] = content;
        }
      });

      Object.keys(unmigratedZonesGrouped).forEach((componentId) => {
        updated.data = walkTree(updated.data, config, (content) => {
          return content.map((child) => {
            if (child.props.id !== componentId) {
              return child;
            }

            const migrateFn =
              migrationOptions?.migrateDynamicZonesForComponent?.[child.type];

            if (!migrateFn) {
              return child;
            }

            const zones = unmigratedZonesGrouped[componentId];
            const migratedProps = migrateFn(child.props, zones);

            Object.keys(zones).forEach((propName) => {
              const zoneCompound = `${componentId}:${propName}`;
              console.log(`✓ Success: Migrated "${zoneCompound}" DropZone`);
              delete updated.data.zones?.[zoneCompound];
            });

            return {
              ...child,
              props: migratedProps,
            };
          });
        });
      });
    }

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

export function migrate<UserConfig extends Config = Config>(
  data: Data,
  config?: UserConfig,
  migrationOptions?: MigrationOptions<UserConfig>
): Data {
  return migrations?.reduce(
    (acc, migration) => migration(acc, config, migrationOptions),
    data
  ) as Data;
}
