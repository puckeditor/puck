import {
  ComponentData,
  Config,
  ExtractField,
  Field,
  UserGenerics,
} from "../../types";
import { MapFnParams, Mappers } from "../data/map-fields";
import {
  FieldTransformFn,
  FieldTransforms,
} from "../../types/API/FieldTransforms";

/**
 * Converts transformers to mappers
 *
 * Transformers are the same as mappers, except they receive the additional `isReadOnly` param.
 * This converts transformers to mappers by adding the `isReadOnly` param.
 */
export function buildMappers<
  T extends ComponentData,
  UserConfig extends Config,
  G extends UserGenerics<UserConfig>
>(
  transforms: FieldTransforms,
  readOnly?: T["readOnly"],
  forceReadOnly?: boolean
) {
  const newMappers: Mappers = {};

  Object.keys(transforms).forEach((_fieldType) => {
    const fieldType = _fieldType as Field["type"]; // Not strictly true, as could include user fields, but this should be safe enough

    newMappers[fieldType] = ({ parentId, ...params }: MapFnParams<Field>) => {
      const wildcardPath = params.propPath.replace(/\[\d+\]/g, "[*]");

      const isReadOnly =
        readOnly?.[params.propPath] ||
        readOnly?.[wildcardPath] ||
        forceReadOnly ||
        false;

      const fn = transforms[fieldType] as FieldTransformFn<
        ExtractField<G["UserField"], Field["type"]>
      >;

      return fn?.({
        ...params,
        field: params.field as ExtractField<G["UserField"], Field["type"]>,
        isReadOnly,
        componentId: parentId,
      });
    };
  });

  return newMappers;
}
