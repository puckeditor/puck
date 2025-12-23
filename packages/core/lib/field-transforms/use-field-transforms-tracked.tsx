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

  // Transformers are the same as mappers, except they receive the additional `isReadOnly` param.
  // This converts transformers to mappers by adding the `isReadOnly` param
  const mappers = useMemo<Mappers>(
    () => buildMappers(transforms, readOnly, forceReadOnly),
    [transforms, readOnly, forceReadOnly]
  );

  const transformedProps = useMemo(() => {
    // Filter to changed fields only (shallow comparison)
    const changedProps: Record<string, any> = {};

    const componentConfig =
      item.type === "root" ? config.root : config.components?.[item.type];

    const propKeys = Object.keys(item.props);
    let changeIncludesSlot = false;

    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i];

      const fieldType = componentConfig?.fields?.[key]?.type;

      if (!prevProps.current || item.props[key] !== prevProps.current[key]) {
        changedProps[key] = item.props[key];

        if (fieldType === "slot") {
          changeIncludesSlot = true;
        }
      }
    }

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
