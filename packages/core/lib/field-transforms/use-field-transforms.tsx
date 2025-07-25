import { ComponentData, Config, Field, UserGenerics } from "../../types";
import { useMemo } from "react";
import { RootData } from "../../types";
import { mapFields, MapFnParams, Mappers } from "../data/map-fields";
import { FieldTransforms } from "../../types/API/FieldTransforms";

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
        [fieldType]: ({ parentId, ...params }: MapFnParams) => {
          const wildcardPath = params.propPath.replace(/\[\d+\]/g, "[*]");
          const isReadOnly =
            readOnly?.[params.propPath] ||
            readOnly?.[wildcardPath] ||
            forceReadOnly ||
            false;

          return transforms[fieldType]?.({
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
