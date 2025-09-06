import { ComponentData } from "../../types";
import type { Fields } from "../../types";
import { AppStore, useAppStoreApi } from "../";
import { useCallback, useEffect } from "react";
import { getChanged } from "../../lib/get-changed";
import { makeStatePublic } from "../../lib/data/make-state-public";

type ComponentOrRootData = Omit<ComponentData<any>, "type">;

export type FieldsSlice = {
  fields: Fields | Partial<Fields>;
  loading: boolean;
  lastResolvedData: Partial<ComponentOrRootData>;
  id: string | undefined;
};

export const createFieldsSlice = (
  _set: (newState: Partial<AppStore>) => void,
  _get: () => AppStore
): FieldsSlice => {
  return {
    fields: {},
    loading: false,
    lastResolvedData: {},
    id: undefined,
  };
};

export const useRegisterFieldsSlice = (
  appStore: ReturnType<typeof useAppStoreApi>,
  id?: string
) => {
  const resolveFields = useCallback(
    async (reset?: boolean) => {
      const { fields, lastResolvedData } = appStore.getState().fields;
      const metadata = appStore.getState().metadata;
      const nodes = appStore.getState().state.indexes.nodes;
      const node = nodes[id || "root"];
      const componentData = node?.data;
      const parentNode = node?.parentId ? nodes[node.parentId] : null;
      const parent = parentNode?.data || null;

      const { getComponentConfig, state } = appStore.getState();

      const componentConfig = getComponentConfig(componentData?.type);

      if (!componentData || !componentConfig) return;

      const defaultFields = componentConfig.fields || {};
      const resolver = componentConfig.resolveFields;
      let lastFields: Fields | null = fields as Fields;

      if (reset) {
        appStore.setState((s) => ({
          fields: { ...s.fields, fields: defaultFields, id },
        }));

        lastFields = defaultFields;
      }

      if (resolver) {
        const timeout = setTimeout(() => {
          appStore.setState((s) => ({
            fields: { ...s.fields, loading: true },
          }));
        }, 50);

        const lastData =
          lastResolvedData.props?.id === id ? lastResolvedData : null;

        const changed = getChanged(componentData, lastData);

        const newFields = await resolver(componentData, {
          changed,
          fields: defaultFields,
          lastFields,
          metadata: { ...metadata, ...componentConfig.metadata },
          lastData: lastData as ComponentOrRootData,
          appState: makeStatePublic(state),
          parent,
        });

        clearTimeout(timeout);

        // Abort if item has changed during resolution (happens with history)
        if (appStore.getState().selectedItem?.props.id !== id) {
          return;
        }

        appStore.setState({
          fields: {
            fields: newFields,
            loading: false,
            lastResolvedData: componentData,
            id,
          },
        });
      } else {
        appStore.setState((s) => ({
          fields: { ...s.fields, fields: defaultFields, id },
        }));
      }
    },
    [id]
  );

  useEffect(() => {
    resolveFields(true);

    return appStore.subscribe(
      (s) => s.state.indexes.nodes[id || "root"],
      () => resolveFields()
    );
  }, [id]);
};
