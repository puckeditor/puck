import { MapFnParams } from "../../lib/data/map-fields";
import { Field } from "../../types";

export type TransformFnParams = MapFnParams & { isReadOnly: boolean };
export type TransformFn<T = any> = (params: TransformFnParams) => T;
export type Transforms = Partial<Record<Field["type"], TransformFn>>;
