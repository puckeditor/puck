import { ReactNode } from "react";
import { Config } from "./Config";
import { DefaultRootFieldProps, PuckContext } from "./Props";
import { ComponentData, Data } from "./Data";
import { ExtractConfigParams, PrivateAppState } from "./Internal";
import { AppState } from "./AppState";
import { BaseField, Field } from "./Fields";

export type WithId<Props> = Props & {
  id: string;
};

export type WithPuckProps<Props> = Props & {
  puck: PuckContext;
  editMode?: boolean;
};
export type AsFieldProps<Props> = Omit<Props, "children" | "puck" | "editMode">;

export type WithChildren<Props> = Props & {
  children: ReactNode;
};

export type UserGenerics<
  UserConfig extends Config = Config,
  UserParams extends ExtractConfigParams<UserConfig> = ExtractConfigParams<UserConfig>,
  UserData extends
    | Data<UserParams["props"], UserParams["rootProps"]>
    | Data = Data<UserParams["props"], UserParams["rootProps"]>,
  UserAppState extends PrivateAppState<UserData> = PrivateAppState<UserData>,
  UserPublicAppState extends AppState<UserData> = AppState<UserData>,
  UserComponentData extends ComponentData = UserData["content"][0]
> = {
  UserConfig: UserConfig;
  UserParams: UserParams;
  UserProps: UserParams["props"];
  UserRootProps: UserParams["rootProps"] & DefaultRootFieldProps;
  UserData: UserData;
  UserAppState: UserAppState;
  UserPublicAppState: UserPublicAppState;
  UserComponentData: UserComponentData;
  UserField:
    | (UserParams["fields"][keyof UserParams["fields"]] & BaseField)
    | Field;
};

export type ExtractField<
  UserField extends { type: PropertyKey },
  T extends UserField["type"]
> = Extract<UserField, { type: T }>;
