import { MapFnParams } from "../../lib/data/map-fields";
import { ExtractField, Field } from "../../types";

export type FieldTransformFnParams<T> = Omit<MapFnParams<T>, "parentId"> & {
  isReadOnly: boolean;
  componentId: string;
};
export type FieldTransformFn<T = any> = (
  params: FieldTransformFnParams<T>
) => any;
export type FieldTransforms = Partial<{
  [FieldType in Field["type"]]: FieldTransformFn<ExtractField<FieldType>>;
}>;
