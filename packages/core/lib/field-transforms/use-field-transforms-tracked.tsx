"use client";

import { ComponentData, Config } from "../../types";
import { useMemo, useRef } from "react";
import { mapFields, Mappers } from "../data/map-fields";
import { FieldTransforms } from "../../types/API/FieldTransforms";
import { buildMappers } from "./build-mappers";

export function useFieldTransformsTracked<
  T extends ComponentData,
  UserConfig extends Config
>(
  config: UserConfig,
  item: T,
  transforms: FieldTransforms,
  readOnly?: T["readOnly"],
  forceReadOnly?: boolean
): T["props"] {
  const prevProps = useRef<Record<string, any>>(null);
  const prevResult = useRef<Record<string, any>>(item.props);

  const mappers = useMemo<Mappers>(
    () => buildMappers(transforms, readOnly, forceReadOnly),
    [transforms, readOnly, forceReadOnly]
  );

  const transformedProps = useMemo(() => {
    // Filter to changed fields only (shallow comparison)
    const changedProps: Record<string, any> = {};

    const componentConfig =
      item.type === "root" ? config.root : config.components?.[item.type];

    let changeIncludesSlot = false;

    for (const fieldName in item.props) {
      const fieldType = componentConfig?.fields?.[fieldName]?.type;

      if (
        !prevProps.current ||
        item.props[fieldName] !== prevProps.current[fieldName]
      ) {
        changedProps[fieldName] = item.props[fieldName];

        if (fieldType === "slot") {
          changeIncludesSlot = true;
        }
      }
    }

    // Always include ID
    changedProps.id = item.props.id;

    prevProps.current = item.props;

    const mapped = mapFields(
      { ...item, props: changedProps },
      mappers,
      config,
      false,
      changeIncludesSlot
    ).props;

    prevResult.current = { ...prevResult.current, ...mapped };

    return prevResult.current;
  }, [config, item, mappers]);

  const mergedProps = useMemo(
    () => ({ ...item.props, ...transformedProps }),
    [item.props, transformedProps]
  );

  return mergedProps;
}
