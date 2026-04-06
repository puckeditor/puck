import { ModalProvider } from "@/packages/platform-client/components/Modal/Modal";
import { setDeep, type ComponentData } from "@puckeditor/core";
import { useEffect } from "react";
import { ConnectedArrayModal } from "../components/ConnectedArrayModal";
import {
  buildArrayItemsToLength,
  syncArrayConnectionsToLength,
} from "../lib/array-utils";
import { queryView } from "../lib/query-view";
import { usePuck } from "../puck";
import { cxConnectedField } from "../styles";
import type { ViewFieldValue, ViewSources } from "../types";

export const createArrayFieldType =
  ({ sources = {} }: { sources?: ViewSources }) =>
  function ArrayFieldType({ children, name, value, field }: any) {
    const selectedItem = usePuck((s) => s.selectedItem);
    const dispatch = usePuck((s) => s.dispatch);
    const getItemById = usePuck((s) => s.getItemById);
    const getSelectorForId = usePuck((s) => s.getSelectorForId);
    const resolveDataById = usePuck((s) => s.resolveDataById);

    const viewSource = selectedItem?.props.view?.source;
    const viewParams = selectedItem?.props.view?.params;
    const viewParamsKey = JSON.stringify(viewParams ?? {});
    const viewArrays = ((selectedItem?.props.view as ViewFieldValue | undefined)
      ?.arrays ?? {}) as Record<string, boolean>;
    const arrayConnected = Boolean(viewArrays[name]);
    const currentArrayLength = Array.isArray(value) ? value.length : 0;
    const defaultItemProps = (field as any).defaultItemProps;

    useEffect(() => {
      if (!arrayConnected || !viewSource) return;

      const selectedId = selectedItem?.props.id;

      if (!selectedId) return;

      let cancelled = false;

      queryView({ source: viewSource, params: viewParams, sources })
        .then((data) => {
          if (cancelled) return;

          const nextLength = Array.isArray(data) ? data.length : 0;
          const currentArray = Array.isArray(value) ? value : [];
          const nextArray = buildArrayItemsToLength({
            currentArray,
            nextLength,
            defaultItemProps,
          });
          const lengthChanged = currentArray.length !== nextArray.length;

          const item = getItemById(selectedId) as ComponentData | undefined;
          const selector = getSelectorForId(selectedId);

          if (!item || !selector) return;

          const view = (item.props.view as ViewFieldValue | undefined) ?? {};
          const { nextConnections, changed } = syncArrayConnectionsToLength({
            connections: view.fields ?? {},
            arrayPath: name,
            nextLength,
          });

          if (lengthChanged || changed) {
            let nextProps = { ...item.props };

            if (lengthChanged) {
              nextProps = setDeep(nextProps, name, nextArray);
            }

            if (changed) {
              nextProps = {
                ...nextProps,
                view: {
                  ...view,
                  fields: nextConnections,
                },
              };
            }

            dispatch({
              type: "replace",
              destinationIndex: selector.index,
              destinationZone: selector.zone,
              data: {
                ...item,
                props: nextProps,
              },
            });
            resolveDataById(selectedId, "replace");
          }
        })
        .catch(() => {
          // No-op: keep the user's current array values on fetch error.
        });

      return () => {
        cancelled = true;
      };
    }, [
      arrayConnected,
      defaultItemProps,
      getItemById,
      getSelectorForId,
      currentArrayLength,
      dispatch,
      name,
      resolveDataById,
      selectedItem?.props.id,
      sources,
      viewSource,
      viewParamsKey,
    ]);

    const updateArrayConnection = async (nextValue: boolean) => {
      const selectedId = selectedItem?.props.id;

      if (!selectedId) return;

      const item = getItemById(selectedId) as ComponentData | undefined;
      const selector = getSelectorForId(selectedId);

      if (!item || !selector) return;

      const view = (item.props.view as ViewFieldValue | undefined) ?? {};
      const arrays = { ...(view.arrays ?? {}) };
      const nextFields = { ...(view.fields ?? {}) };
      let nextArray: any[] | null = null;

      if (!nextValue) {
        delete arrays[name];

        Object.keys(nextFields).forEach((fieldPath) => {
          if (fieldPath.startsWith(`${name}[`)) {
            delete nextFields[fieldPath];
          }
        });
      } else {
        if (!view.source) return;

        const viewData = await queryView({
          source: view.source,
          params: view.params,
          sources,
        });

        const nextLength = Array.isArray(viewData) ? viewData.length : 0;
        const currentArray = Array.isArray(value) ? value : [];
        nextArray = buildArrayItemsToLength({
          currentArray,
          nextLength,
          defaultItemProps,
        });

        arrays[name] = true;
        const { nextConnections } = syncArrayConnectionsToLength({
          connections: nextFields,
          arrayPath: name,
          nextLength,
        });

        Object.keys(nextFields).forEach((key) => {
          delete nextFields[key];
        });
        Object.assign(nextFields, nextConnections);
      }

      dispatch({
        type: "replace",
        destinationIndex: selector.index,
        destinationZone: selector.zone,
        data: {
          ...item,
          props: {
            ...(nextArray
              ? setDeep({ ...item.props }, name, nextArray)
              : item.props),
            view: {
              ...view,
              arrays,
              fields: nextFields,
            },
          },
        },
      });

      resolveDataById(selectedId, "replace");
    };

    if (viewSource) {
      return (
        <div className={cxConnectedField()}>
          <div className={cxConnectedField("header")}>
            <ModalProvider>
              <ConnectedArrayModal
                value={arrayConnected}
                onChange={updateArrayConnection}
              />
            </ModalProvider>
          </div>
          {children}
        </div>
      );
    }

    return children;
  };
