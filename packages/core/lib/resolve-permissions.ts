import { AppState, Config, Permissions, UserGenerics } from "../types";

export const resolvePermissions = <
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>({
  data,
  lastData,
  config,
  changed,
  lastPermissions,
  permissions,
  appState,
}: {
  data: G["UserData"]["content"][0] | undefined;
  lastData: G["UserData"]["content"][0] | null;
  config: UserConfig;
  changed: Record<string, boolean>;
  lastPermissions: Partial<Permissions>;
  permissions: Partial<Permissions>;
  appState: AppState<G["UserData"]>;
}) => {
  const componentConfig = data ? config.components[data.type] : null;

  if (data && lastData && componentConfig?.resolvePermissions) {
    return componentConfig.resolvePermissions(data, {
      changed,
      lastPermissions,
      permissions,
      appState,
      lastData,
    });
  }

  return {};
};
