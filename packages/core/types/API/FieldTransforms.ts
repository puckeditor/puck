import { MapFnParams } from "../../lib/data/map-fields";
import { Config, ExtractField, UserGenerics } from "../../types";

export type FieldTransformFnParams<T> = Omit<MapFnParams<T>, "parentId"> & {
  isReadOnly: boolean;
  componentId: string;
};

export type FieldTransformFn<T> = (params: FieldTransformFnParams<T>) => any;

export type FieldTransforms<
  UserConfig extends Config = { components: {}; fields: {} },
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
> = Partial<{
  [Type in G["UserField"]["type"]]: FieldTransformFn<
    ExtractField<G["UserField"], Type>
  >;
}>;
