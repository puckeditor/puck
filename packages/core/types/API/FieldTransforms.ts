import { MapFnParams } from "../../lib/data/map-fields";
import { Config, ExtractField, Field, UserGenerics } from "../../types";

export type FieldTransformFnParams<T> = Omit<MapFnParams<T>, "parentId"> & {
  isReadOnly: boolean;
  componentId: string;
};

export type FieldTransformFn<T> = (params: FieldTransformFnParams<T>) => any;

export type FieldTransforms<
  UserConfig extends Config = Config<{ fields: {} }>, // Setting fields: {} helps TS choose default field types
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>,
  UserField extends { type: string } = Field | G["UserField"]
> = Partial<{
  [Type in UserField["type"]]: FieldTransformFn<ExtractField<UserField, Type>>;
}>;
