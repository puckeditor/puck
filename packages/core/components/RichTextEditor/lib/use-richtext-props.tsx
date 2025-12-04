import { useMemo } from "react";
import { RichTextRender } from "../Render";
import {
  BaseField,
  Fields,
  RichtextField,
  WithPuckProps,
} from "../../../types";

export function useRichtextProps(
  fields:
    | Fields<any, {}>
    | Fields<any, { type: string } & BaseField>
    | undefined,
  props: WithPuckProps<{
    [x: string]: any;
  }>
) {
  const findAllRichtextKeys = (
    fields:
      | Fields<any, {}>
      | Fields<any, { type: string } & BaseField>
      | undefined
  ): string[] => {
    if (!fields) return [];

    const result: string[] = [];

    for (const [key, field] of Object.entries(fields)) {
      if (field.type === "richtext") {
        result.push(key);
      }
    }

    return result;
  };

  const richtextKeys = useMemo(() => findAllRichtextKeys(fields), [fields]);

  const richtextProps = useMemo(() => {
    if (!richtextKeys) return {};

    return richtextKeys.reduce((acc, key) => {
      acc[key] = (
        <RichTextRender
          content={props[key]}
          field={fields![key] as RichtextField}
        />
      );
      return acc;
    }, {} as Record<string, React.ReactNode>);
  }, [richtextKeys, props]);

  return richtextProps;
}
