import { ActionModal } from "@/packages/platform-client/components/ActionModal";
import { Loader } from "@/packages/platform-client/components/Loader";
import { ModalProvider } from "@/packages/platform-client/components/Modal/Modal";
import { Table } from "@/packages/platform-client/components/Table/Table";
import { AutoField, FieldLabel, ObjectField, SelectField } from "@puckeditor/core";
import { useEffect, useState } from "react";
import { ViewConnectAction } from "../components/ViewConnectAction";
import { queryView } from "../lib/query-view";
import { buildViewFieldObjectFields } from "../lib/view-field-object-fields";
import { cxViews } from "../styles";
import type { ReferenceOption, ViewFieldConnection, ViewSources } from "../types";

export const createViewFieldType =
  ({
    references,
    sources = {},
  }: {
    references?: ReferenceOption[];
    sources?: ViewSources;
  }) =>
  function ViewFieldType({ value, onChange, field }: any) {
    const views = ((field?.sources as ViewSources | undefined) ?? sources) as ViewSources;
    const [source, setSource] = useState<string | null>(value?.source);
    const [filters, setFilters] = useState(value?.params ?? {});
    const [fields, setFields] = useState<Record<string, ViewFieldConnection>>(
      value?.fields ?? {}
    );
    const [arrays, setArrays] = useState<Record<string, boolean>>(
      value?.arrays ?? {}
    );
    const [valueLocal, setValueLocal] = useState(value);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);

    useEffect(() => {
      setSource(value?.source ?? null);
      setFilters(value?.params ?? {});
      setFields(value?.fields ?? {});
      setArrays(value?.arrays ?? {});
      setValueLocal(value);
    }, [value]);

    useEffect(() => {
      if (value?.source) return;

      const availableSources = Object.keys(views);

      if (availableSources.length > 0) {
        setSource(availableSources[0]);
      } else {
        setSource(null);
      }
    }, [value?.source, views]);

    useEffect(() => {
      if (!source) {
        setLoading(false);
        setPreviewData([]);
        return;
      }

      let cancelled = false;

      setLoading(true);

      queryView({ source, params: filters, sources: views })
        .then((data) => {
          if (cancelled) return;

          setPreviewData(Array.isArray(data) ? data : []);
          setValueLocal({ source, params: filters, fields, arrays });
        })
        .catch(() => {
          if (cancelled) return;

          setPreviewData([]);
        })
        .finally(() => {
          if (cancelled) return;

          setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [source, filters, fields, arrays]);

    const sourceSelectField: SelectField = {
      type: "select",
      options: Object.entries(views).map(([viewSource]) => ({
        label: viewSource,
        value: viewSource,
      })),
    };

    const paramsField: ObjectField | null =
      source && views[source]
        ? {
            type: "object",
            objectFields: buildViewFieldObjectFields({
              viewFields: views[source].fields,
              references,
            }),
          }
        : null;

    return (
      <div className={cxViews()}>
        <FieldLabel label="View">
          <ModalProvider>
            <ActionModal
              title="Views"
              actionLabel={value ? `Connected: ${value.source}` : "Select view"}
              actions={
                <ViewConnectAction
                  onConnect={() => {
                    onChange(valueLocal);
                  }}
                />
              }
            >
              <div className={cxViews("body")}>
                <div className={cxViews("form")}>
                  <FieldLabel label="Source">
                    <AutoField
                      field={sourceSelectField}
                      value={source}
                      onChange={(nextSource) => {
                        setSource(nextSource);
                        setFilters({});
                        setFields({});
                        setArrays({});
                      }}
                    />
                  </FieldLabel>

                  <div className={cxViews("fields")}>
                    {paramsField && (
                      <AutoField
                        field={paramsField}
                        value={filters}
                        onChange={(nextFilters) => setFilters(nextFilters)}
                      />
                    )}
                  </div>
                </div>
                <div className={cxViews("preview")}>
                  {previewData.length > 0 ? (
                    <Table
                      header={Object.keys(previewData[0]).map((key) => ({
                        label: key,
                        value: key,
                      }))}
                      data={previewData}
                    />
                  ) : !loading ? (
                    <p className={cxViews("noData")}>No data</p>
                  ) : null}
                  {loading ? (
                    <div className={cxViews("loader")}>
                      <Loader size={16} />
                    </div>
                  ) : null}
                </div>
              </div>
            </ActionModal>
          </ModalProvider>
        </FieldLabel>
      </div>
    );
  };
