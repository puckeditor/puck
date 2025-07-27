import { ComponentData, Config, ExtractField, Field } from "../../types";
import { useMemo } from "react";
import { RootData } from "../../types";
import { mapFields, MapFnParams, Mappers } from "../data/map-fields";
import {
  FieldTransformFn,
  FieldTransforms,
} from "../../types/API/FieldTransforms";

export function useFieldTransforms<T extends ComponentData | RootData>(
  config: Config,
  item: T,
  transforms: FieldTransforms,
  readOnly?: T["readOnly"],
  forceReadOnly?: boolean
): T["props"] {
  // Transformers are the same as mappers, except they receive the additional `isReadOnly` param.
  // This converts transformers to mappers by adding the `isReadOnly` param
  const mappers = useMemo<Mappers>(() => {
    return Object.keys(transforms).reduce<Mappers>((acc, _fieldType) => {
      const fieldType = _fieldType as Field["type"];

      return {
        ...acc,
        [fieldType]: ({
          parentId,
          ...params
        }: MapFnParams<ExtractField<Field["type"]>>) => {
          const wildcardPath = params.propPath.replace(/\[\d+\]/g, "[*]");
          const isReadOnly =
            readOnly?.[params.propPath] ||
            readOnly?.[wildcardPath] ||
            forceReadOnly ||
            false;

          const fn = transforms[fieldType] as FieldTransformFn<
            ExtractField<Field["type"]>
          >;

          return fn?.({
            ...params,
            isReadOnly,
            componentId: parentId,
          });
        },
      };
    }, {});
  }, [transforms, readOnly, forceReadOnly]);

  const transformedProps = useMemo(() => {
    const mapped = mapFields(item, mappers, config).props;

    return mapped;
  }, [config, item, mappers]);

  const mergedProps = useMemo(
    () => ({ ...item.props, ...transformedProps }),
    [item.props, transformedProps]
  );

  return mergedProps;
}
