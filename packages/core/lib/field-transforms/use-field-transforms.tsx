import { ComponentData, Config } from "../../types";
import { useMemo } from "react";
import { mapFields, Mappers } from "../data/map-fields";
import { FieldTransforms } from "../../types/API/FieldTransforms";
import { buildMappers } from "./build-mappers";

export function useFieldTransforms<
  T extends ComponentData,
  UserConfig extends Config
>(
  config: UserConfig,
  item: T,
  transforms: FieldTransforms,
  readOnly?: T["readOnly"],
  forceReadOnly?: boolean
): T["props"] {
  const mappers = useMemo<Mappers>(
    () => buildMappers(transforms, readOnly, forceReadOnly),
    [transforms, readOnly, forceReadOnly]
  );

  const transformedProps = useMemo(() => {
    return mapFields(item, mappers, config).props;
  }, [config, item, mappers]);

  const mergedProps = useMemo(
    () => ({ ...item.props, ...transformedProps }),
    [item.props, transformedProps]
  );

  return mergedProps;
}
