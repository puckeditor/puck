import { lazy, Suspense, useMemo } from "react";
import type { ReactNode } from "react";
import {
  BaseField,
  Fields,
  RichtextField,
  WithPuckProps,
} from "../../../types";
import { RichTextRenderFallback } from "../components/RenderFallback";

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
    if (!richtextKeys?.length) return {};

    const RichTextRender = lazy(() =>
      import("../components/Render").then((m) => ({
        default: m.RichTextRender,
      }))
    );

    return richtextKeys.reduce((acc, key) => {
      acc[key] = (
        <Suspense fallback={<RichTextRenderFallback content={props[key]} />}>
          <RichTextRender
            content={props[key]}
            field={fields![key] as RichtextField}
          />
        </Suspense>
      );
      return acc;
    }, {} as Record<string, ReactNode>);
  }, [richtextKeys, props, fields]);

  return richtextProps;
}
