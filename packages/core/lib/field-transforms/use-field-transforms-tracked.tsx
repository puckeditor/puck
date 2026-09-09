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
  const prevMappers = useRef<Mappers>(null);
  const prevProps = useRef<Record<string, any>>(null);
  const prevResult = useRef<Record<string, any>>(item.props);

  const mappers = useMemo<Mappers>(
    () => buildMappers(transforms, readOnly, forceReadOnly),
    [transforms, readOnly, forceReadOnly]
  );

  const transformedProps = useMemo(() => {
    const componentConfig =
      item.type === "root" ? config.root : config.components?.[item.type];

    const componentFields = componentConfig?.fields ?? {};

    // Transformed props depend on mappers, so a mappers change
    // invalidates all of them (e.g when readOnly changes)
    const fullRemap = prevMappers.current !== mappers;

    let changedFields: string[] | undefined;
    let changeIncludesSlot = false;

    if (!prevProps.current || fullRemap) {
      for (const fieldName in item.props) {
        if (componentFields[fieldName]?.type === "slot") {
          changeIncludesSlot = true;
        }
      }
    } else {
      changedFields = ["id"]; // Always include ID

      const allFieldNames = new Set([
        ...Object.keys(item.props),
        ...Object.keys(prevProps.current),
      ]);

      for (const fieldName of allFieldNames) {
        if (item.props[fieldName] !== prevProps.current[fieldName]) {
          changedFields.push(fieldName);

          if (componentFields[fieldName]?.type === "slot") {
            changeIncludesSlot = true;
          }
        }
      }
    }

    const mapped = mapFields(
      item,
      mappers,
      config,
      false,
      changeIncludesSlot,
      changedFields
    ).props;

    prevProps.current = item.props;
    prevMappers.current = mappers;
    prevResult.current = changedFields
      ? { ...prevResult.current, ...mapped }
      : mapped;

    return prevResult.current;
  }, [config, item, mappers]);

  const mergedProps = useMemo(
    () => ({ ...item.props, ...transformedProps }),
    [item.props, transformedProps]
  );

  return mergedProps;
}
