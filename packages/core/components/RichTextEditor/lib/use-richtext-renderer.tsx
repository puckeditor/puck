import { useMemo } from "react";
import { Render } from "../Render";
import { BaseField, Fields, WithPuckProps } from "../../../types";

export function useRichtextRenderer(
  fields:
    | Fields<any, {}>
    | Fields<any, { type: string } & BaseField>
    | undefined,
  props: WithPuckProps<{
    [x: string]: any;
    id: string;
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

  const richTextRenderer = useMemo(() => {
    if (!richtextKeys) return {};

    return richtextKeys.reduce((acc, key) => {
      acc[key] = <Render content={props[key]} />;
      return acc;
    }, {} as Record<string, React.ReactNode>);
  }, [richtextKeys, props]);

  return richTextRenderer;
}
