import { ComponentData } from "../../types";
import type { Fields, ResolverTrigger, RootDataWithProps } from "../../types";
import { AppStore, defaultPageFields, useAppStoreApi } from "../";
import { useCallback, useEffect } from "react";
import { resolveFields } from "../../lib/resolve-fields";
import { getConfig } from "../../lib/get-config";

export type FieldsSlice = {
  resolved: Record<string, Fields>;
  resolveFields: <T extends ComponentData | RootDataWithProps>(
    componentData: T,
    trigger: ResolverTrigger
  ) => Promise<{ data: Fields; didChange: boolean }>;
  resolveAllFields: () => void;
  get: () => Fields;
};

export const createFieldsSlice = (
  set: (newState: Partial<AppStore>) => void,
  get: () => AppStore
): FieldsSlice => {
  return {
    resolved: {},
    resolveFields: async (componentData, trigger) => {
      const { metadata, setComponentLoading, config, state } = get();

      const timeouts: Record<string, () => void> = {};

      return await resolveFields(
        componentData,
        config,
        state,
        metadata,
        (item) => {
          const id = "id" in item.props ? item.props.id : "root";
          timeouts[id] = setComponentLoading(id, true, 50);
        },
        async (item, resolvedFields) => {
          const id = "id" in item.props ? item.props.id : "root";

          const fields = get().fields;

          if (resolvedFields.didChange) {
            set({
              fields: {
                ...fields,
                resolved: {
                  ...fields.resolved,
                  [item.props.id]: resolvedFields.data,
                },
              },
            });
          }

          timeouts[id]();
        },
        trigger
      );
    },
    resolveAllFields: () => {},
    get: () => {
      const s = get();

      const item = s.selectedItem;

      if (item) {
        const config = s.config;
        const componentConfig = getConfig(item, config);

        const resolvedFields =
          s.fields.resolved[item.props.id] ?? componentConfig?.fields ?? {};

        return resolvedFields;
      }

      return (
        s.fields.resolved["root"] ?? s.config.root?.fields ?? defaultPageFields
      );
    },
  };
};

export const useRegisterFieldsSlice = (
  appStore: ReturnType<typeof useAppStoreApi>,
  id?: string
) => {
  const resolveFields = useCallback(async () => {
    const fields = appStore.getState().fields;
    const nodes = appStore.getState().state.indexes.nodes;
    const node = nodes[id || "root"];
    const componentData = node?.data;

    fields.resolveFields(componentData, "replace");
  }, [id]);

  useEffect(() => {
    return appStore.subscribe(
      (s) => s.state.indexes.nodes[id || "root"],
      () => resolveFields()
    );
  }, [id]);
};
