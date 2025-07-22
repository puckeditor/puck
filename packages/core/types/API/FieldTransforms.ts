import { MapFnParams } from "../../lib/data/map-fields";
import { Field } from "../../types";

export type FieldTransformFnParams = MapFnParams & { isReadOnly: boolean };
export type FieldTransformFn<T = any> = (params: FieldTransformFnParams) => T;
export type FieldTransforms = Partial<Record<Field["type"], FieldTransformFn>>;
