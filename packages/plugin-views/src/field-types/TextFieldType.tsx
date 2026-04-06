import { ModalProvider } from "@/packages/platform-client/components/Modal/Modal";
import type { ComponentData } from "@puckeditor/core";
import { useEffect, useState } from "react";
import { ConnectedFieldModal } from "../components/ConnectedFieldModal";
import {
  getArrayItemFieldPathParts,
  getConnectedArrayContext,
  getValueAtPath,
} from "../lib/array-utils";
import { queryView } from "../lib/query-view";
import { usePuck } from "../puck";
import { cxConnectedField } from "../styles";
import type { ViewFieldConnection, ViewFieldValue, ViewSources } from "../types";

export const createTextFieldType =
  ({ sources = {} }: { sources?: ViewSources }) =>
  function TextFieldType({ children, name, value, onChange }: any) {
    const selectedItem = usePuck((s) => s.selectedItem);
    const dispatch = usePuck((s) => s.dispatch);
    const getItemById = usePuck((s) => s.getItemById);
    const getSelectorForId = usePuck((s) => s.getSelectorForId);
    const resolveDataById = usePuck((s) => s.resolveDataById);

    const [options, setOptions] = useState<{ label: string; value: string }[]>();
    const [valuesByKey, setValuesByKey] = useState<Record<string, any>>({});

    const viewSource = selectedItem?.props.view?.source;
    const viewParams = selectedItem?.props.view?.params;
    const viewArrays = ((selectedItem?.props.view as ViewFieldValue | undefined)
      ?.arrays ?? {}) as Record<string, boolean>;
    const connectedArrayContext = getConnectedArrayContext({
      path: name,
      arrays: viewArrays,
    });
    const connectedArrayIndex = connectedArrayContext?.index;

    useEffect(() => {
      if (!viewSource) return;

      setOptions([{ value: "", label: "Loading..." }]);

      queryView({ source: viewSource, params: viewParams, sources })
        .then((data: any[]) => {
          const viewOptions: { label: string; value: string }[] = [];
          const nextValuesByKey: Record<string, any> = {};

          data.forEach((item, idx) => {
            if (
              typeof connectedArrayIndex === "number" &&
              idx !== connectedArrayIndex
            ) {
              return;
            }

            Object.entries(item)
              .filter(([_, propertyValue]) => typeof propertyValue === "string")
              .forEach(([propertyName, propertyValue]) => {
                const propertyId = `[${idx}].${propertyName}`;
                const label =
                  typeof connectedArrayIndex === "number"
                    ? propertyName
                    : `${propertyId}: ${propertyValue}`;

                viewOptions.push({
                  label,
                  value: propertyId,
                });

                nextValuesByKey[propertyId] = {
                  value: propertyValue,
                  index: idx,
                  propertyName,
                };
              });
          });

          setOptions(viewOptions);
          setValuesByKey(nextValuesByKey);
        })
        .catch(() => {
          setOptions([]);
          setValuesByKey({});
        });
    }, [viewSource, viewParams, connectedArrayIndex, sources]);

    const selectedConnection = (selectedItem?.props.view as
      | ViewFieldValue
      | undefined)?.fields?.[name] as ViewFieldConnection | undefined;

    const connectedValue = selectedConnection
      ? valuesByKey[selectedConnection.propertyId]?.value
      : undefined;

    const updateConnection = (selectedValue: string) => {
      const selectedId = selectedItem?.props.id;

      if (!selectedId) return;

      const item = getItemById(selectedId) as ComponentData | undefined;
      const selector = getSelectorForId(selectedId);

      if (!item || !selector) return;

      const view = (item.props.view as ViewFieldValue | undefined) ?? {};
      const fields = { ...(view.fields ?? {}) };
      const nextSelection = valuesByKey[selectedValue];
      const arrayPath = connectedArrayContext?.arrayPath;
      const arrayIndex = connectedArrayContext?.index;

      if (selectedValue && nextSelection) {
        if (
          typeof connectedArrayIndex === "number" &&
          nextSelection.index !== connectedArrayIndex
        ) {
          return;
        }

        if (typeof arrayIndex === "number" && typeof arrayPath === "string") {
          const parts = getArrayItemFieldPathParts({
            path: name,
            arrayPath,
            index: arrayIndex,
          });

          if (!parts) return;

          const arrayValue = getValueAtPath(item.props, arrayPath);
          const arrayLength = Array.isArray(arrayValue) ? arrayValue.length : 0;

          for (let idx = 0; idx < arrayLength; idx++) {
            const itemFieldPath = `${arrayPath}[${idx}].${parts.relativePath}`;

            fields[itemFieldPath] = {
              propertyId: `[${idx}].${nextSelection.propertyName}`,
              index: idx,
              propertyName: nextSelection.propertyName,
            };
          }
        } else {
          fields[name] = {
            propertyId: selectedValue,
            index: nextSelection.index,
            propertyName: nextSelection.propertyName,
          };
        }
      } else if (
        typeof arrayIndex === "number" &&
        typeof arrayPath === "string"
      ) {
        const parts = getArrayItemFieldPathParts({
          path: name,
          arrayPath,
          index: arrayIndex,
        });

        if (!parts) return;

        Object.keys(fields).forEach((fieldPath) => {
          if (
            fieldPath.startsWith(`${arrayPath}[`) &&
            fieldPath.endsWith(`.${parts.relativePath}`)
          ) {
            delete fields[fieldPath];
          }
        });
      } else {
        delete fields[name];
      }

      dispatch({
        type: "replace",
        destinationIndex: selector.index,
        destinationZone: selector.zone,
        data: {
          ...item,
          props: {
            ...item.props,
            view: {
              ...view,
              fields,
            },
          },
        },
      });

      resolveDataById(selectedId, "replace");
    };

    if (selectedItem?.props.view && selectedItem?.props.view.source && options) {
      return (
        <div className={cxConnectedField()}>
          <label>
            <div className={cxConnectedField("header")}>
              <div className={cxConnectedField("label")}>{name}</div>
              <ModalProvider>
                <ConnectedFieldModal
                  options={options}
                  value={selectedConnection?.propertyId ?? ""}
                  onChange={updateConnection}
                />
              </ModalProvider>
            </div>
            <input
              className={cxConnectedField("input")}
              readOnly={Boolean(selectedConnection)}
              value={
                connectedValue ?? (typeof value === "string" ? value : value ?? "")
              }
              onChange={(e) => onChange(e.currentTarget.value)}
            />
          </label>
        </div>
      );
    }

    return children;
  };
