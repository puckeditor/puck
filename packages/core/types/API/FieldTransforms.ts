import { MapFnParams } from "../../lib/data/map-fields";
import { Field } from "../../types";

export type FieldTransformFnParams = Omit<MapFnParams, "parentId"> & {
  isReadOnly: boolean;
  componentId: string;
};
export type FieldTransformFn<T = any> = (params: FieldTransformFnParams) => T;
export type FieldTransforms = Partial<Record<Field["type"], FieldTransformFn>>;
