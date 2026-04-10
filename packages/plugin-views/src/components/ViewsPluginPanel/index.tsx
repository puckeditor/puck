"use client";

import { AutoField, Button, FieldLabel, createUsePuck } from "@puckeditor/core";
import type { Field, Fields } from "@puckeditor/core";
import { Database } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import {
  clearQueryCache,
  collectNodeIds,
  collectViewUsageCounts,
  createViewId,
  getResolvedViews,
  getViewsStorage,
  queryResolvedView,
  toRootComponent,
  updateStorageInRoot,
} from "../../lib/views";
import type { CustomView, ViewsPluginOptions } from "../../types";
import styles from "./style.module.css";
import { Loader } from "../Loader";
import { Modal } from "../Modal";
import { SidebarSection } from "../SidebarSection";

const usePuck = createUsePuck();
const getClassName = getClassNameFactory("ViewsPluginPanel", styles);

const normalizeViewId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const Preview = ({ data }: { data: any }) => {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const keys = Array.from(
      data.reduce<Set<string>>((acc, item) => {
        Object.keys(item || {}).forEach((key) => acc.add(key));

        return acc;
      }, new Set<string>())
    ).slice(0, 6);

    return (
      <div className={getClassName("previewTableWrap")}>
        <table className={getClassName("previewTable")}>
          <thead>
            <tr>
              {keys.map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((item, index) => (
              <tr key={index}>
                {keys.map((key) => (
                  <td key={key}>{String(item?.[key] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className={getClassName("previewJson")}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

export function ViewsPluginPanel({ options }: { options: ViewsPluginOptions }) {
  const appState = usePuck((s) => s.appState);
  const config = usePuck((s) => s.config);
  const dispatch = usePuck((s) => s.dispatch);
  const resolveDataById = usePuck((s) => s.resolveDataById);
  const rootComponent = useMemo(
    () => toRootComponent(appState.data.root),
    [appState.data.root]
  );
  const storage = useMemo(
    () =>
      getViewsStorage({
        root: appState.data.root,
        storageKey: options.storageKey,
      }),
    [appState.data.root, options.storageKey]
  );
  const views = useMemo(
    () =>
      getResolvedViews({
        root: appState.data.root,
        builtInViews: options.builtInViews,
        storageKey: options.storageKey,
      }),
    [appState.data.root, options.builtInViews, options.storageKey]
  );
  const usageCounts = useMemo(
    () =>
      collectViewUsageCounts({
        data: appState.data as any,
        config,
        nodeStateKey: options.nodeStateKey,
      }),
    [appState.data, config, options.nodeStateKey]
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    views[0]?.id ?? null
  );
  const [draft, setDraft] = useState<CustomView | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && !draft && views[0]?.id) {
      setSelectedId(views[0].id);
    }
  }, [draft, selectedId, views]);

  const selectedView = useMemo(() => {
    const existing = views.find((view) => view.id === selectedId);

    if (existing) {
      return existing;
    }

    if (draft && draft.id === selectedId) {
      return {
        ...draft,
        builtIn: false,
      };
    }

    return null;
  }, [draft, selectedId, views]);

  const editableView = useMemo(
    () =>
      draft && draft.id === selectedView?.id
        ? draft
        : selectedView && !selectedView.builtIn
        ? {
            id: selectedView.id,
            label: selectedView.label,
            source: selectedView.source,
            params: selectedView.params ?? {},
          }
        : null,
    [draft, selectedView]
  );
  const previewView = useMemo(
    () => editableView ?? selectedView,
    [editableView, selectedView]
  );
  const isPersistedCustomView = Boolean(
    selectedView &&
      !selectedView.builtIn &&
      storage.custom.some((view) => view.id === selectedView.id)
  );

  useEffect(() => {
    if (!isEditorOpen || !previewView) {
      setPreviewData(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let active = true;

    setPreviewLoading(true);
    setPreviewError(null);

    queryResolvedView({
      view: previewView,
      root: rootComponent,
      sources: options.sources,
    })
      .then((data) => {
        if (active) {
          setPreviewData(data);
        }
      })
      .catch(() => {
        if (active) {
          setPreviewData(null);
          setPreviewError("Could not fetch preview data.");
        }
      })
      .finally(() => {
        if (active) {
          setPreviewLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isEditorOpen, options.sources, previewView, rootComponent]);

  const sourceField: Field = {
    type: "select",
    label: "Source",
    options: Object.keys(options.sources).map((source) => ({
      label: source,
      value: source,
    })),
  };

  const labelField: Field = {
    type: "text",
    label: "Label",
  };

  const idField: Field = {
    type: "text",
    label: "ID",
  };

  const paramsField: Field | null =
    editableView && options.sources[editableView.source]
      ? {
          type: "object",
          objectFields: options.sources[editableView.source].fields,
        }
      : selectedView && options.sources[selectedView.source]
      ? {
          type: "object",
          objectFields: options.sources[selectedView.source].fields,
        }
      : null;

  const selectedUsageCount = selectedView
    ? usageCounts[selectedView.id] || 0
    : 0;

  const refreshAll = async () => {
    clearQueryCache();

    await Promise.resolve(resolveDataById("root", "force"));

    await Promise.all(
      collectNodeIds({
        data: appState.data as any,
        config,
      }).map((id) => Promise.resolve(resolveDataById(id, "force")))
    );
  };

  const saveCustomViews = async (nextCustomViews: CustomView[]) => {
    dispatch({
      type: "setData",
      data: (currentData: any) => ({
        root: updateStorageInRoot({
          root: currentData.root,
          storageKey: options.storageKey,
          storage: {
            custom: nextCustomViews,
          },
        }),
      }),
      recordHistory: true,
    });

    await refreshAll();
  };

  const openBuiltInView = (viewId: string) => {
    setSelectedId(viewId);
    setDraft(null);
    setEditorOpen(true);
  };

  const openCustomView = (view: CustomView) => {
    setSelectedId(view.id);
    setDraft({
      ...view,
      params: view.params ?? {},
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setDraft(null);

    if (!selectedView) {
      setSelectedId(views[0]?.id ?? null);
      return;
    }

    if (!selectedView.builtIn && !isPersistedCustomView) {
      setSelectedId(views[0]?.id ?? null);
    }
  };

  return (
    <SidebarSection title="Views" noBorderTop>
      <div className={getClassName()}>
        <div className={getClassName("sectionHeader")}>
          <h3 className={getClassName("sectionTitle")}>Built-in</h3>
        </div>
        <div className={getClassName("list")}>
          {views
            .filter((view) => view.builtIn)
            .map((view) => (
              <button
                className={getClassName("listItem")}
                key={view.id}
                onClick={() => openBuiltInView(view.id)}
                type="button"
              >
                <Database size={16} />
                <div className={getClassName("listItemMeta")}>
                  <div className={getClassName("listItemTitle")}>
                    {view.label}
                  </div>
                  <div className={getClassName("listItemSubtitle")}>
                    {view.source}
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className={getClassName("sectionHeader")}>
          <h3 className={getClassName("sectionTitle")}>Custom</h3>
          <Button
            onClick={() => {
              const existingIds = views.map((view) => view.id);
              const nextDraft: CustomView = {
                id: createViewId({
                  existingIds,
                  source: Object.keys(options.sources)[0],
                }),
                label: "New view",
                source: Object.keys(options.sources)[0],
                params: {},
              };

              setDraft(nextDraft);
              setSelectedId(nextDraft.id);
              setEditorOpen(true);
            }}
            size="medium"
            type="button"
            variant="secondary"
          >
            New
          </Button>
        </div>

        <div className={getClassName("list")}>
          {storage.custom.map((view) => (
            <button
              className={getClassName("listItem")}
              key={view.id}
              onClick={() => openCustomView(view)}
              type="button"
            >
              <Database size={16} />
              <div className={getClassName("listItemMeta")}>
                <div className={getClassName("listItemTitle")}>
                  {view.label}
                </div>
                <div className={getClassName("listItemSubtitle")}>
                  {view.source}
                </div>
              </div>
              {usageCounts[view.id] ? (
                <span className={getClassName("usagePill")}>
                  {usageCounts[view.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <Modal isOpen={isEditorOpen && !!selectedView} onClose={closeEditor}>
        {selectedView ? (
          <div className={getClassName("modal")}>
            <div className={getClassName("modalHeader")}>
              <h3 className={getClassName("modalTitle")}>
                {selectedView.builtIn
                  ? selectedView.label
                  : isPersistedCustomView
                  ? "Edit view"
                  : "New view"}
              </h3>
            </div>
            <div className={getClassName("modalBody")}>
              <div className={getClassName("modalForm")}>
                <div className={getClassName("detailCard")}>
                  <FieldLabel label="Label">
                    <AutoField
                      field={labelField}
                      onChange={(nextLabel) => {
                        if (!editableView) return;

                        setDraft({
                          ...editableView,
                          label: nextLabel,
                        });
                      }}
                      readOnly={selectedView.builtIn}
                      value={editableView?.label ?? selectedView.label}
                    />
                  </FieldLabel>

                  <FieldLabel label="ID">
                    <AutoField
                      field={idField}
                      onChange={(nextId) => {
                        if (!editableView) return;

                        const normalizedId = normalizeViewId(nextId || "");

                        setDraft({
                          ...editableView,
                          id: normalizedId,
                        });
                        setSelectedId(normalizedId);
                      }}
                      readOnly={selectedView.builtIn || isPersistedCustomView}
                      value={editableView?.id ?? selectedView.id}
                    />
                  </FieldLabel>

                  <FieldLabel label="Source">
                    <AutoField
                      field={sourceField}
                      onChange={(nextSource) => {
                        if (!editableView) return;

                        setDraft({
                          ...editableView,
                          source: nextSource,
                          params: {},
                        });
                      }}
                      readOnly={selectedView.builtIn}
                      value={editableView?.source ?? selectedView.source}
                    />
                  </FieldLabel>

                  {paramsField && (
                    <AutoField
                      field={paramsField}
                      onChange={(nextParams) => {
                        if (!editableView) return;

                        setDraft({
                          ...editableView,
                          params: nextParams ?? {},
                        });
                      }}
                      readOnly={selectedView.builtIn}
                      value={editableView?.params ?? selectedView.params ?? {}}
                    />
                  )}

                  {!selectedView.builtIn && selectedUsageCount > 0 && (
                    <div className={getClassName("helperText")}>
                      This view is referenced {selectedUsageCount} time
                      {selectedUsageCount === 1 ? "" : "s"} and cannot be
                      deleted.
                    </div>
                  )}
                </div>
              </div>

              <div className={getClassName("modalPreview")}>
                <div className={getClassName("previewCard")}>
                  {previewLoading && (
                    <div className={getClassName("stateBox")}>
                      <Loader size={18} />
                    </div>
                  )}
                  {!previewLoading && previewError && (
                    <div className={getClassName("stateBox")}>
                      {previewError}
                    </div>
                  )}
                  {!previewLoading && !previewError && previewData !== null && (
                    <Preview data={previewData} />
                  )}
                </div>
              </div>
            </div>
            <div className={getClassName("modalFooter")}>
              {selectedView.builtIn ? (
                <>
                  <Button
                    onClick={() => {
                      const existingIds = views.map((view) => view.id);
                      const duplicated: CustomView = {
                        id: createViewId({
                          existingIds,
                          label: selectedView.label,
                          source: selectedView.source,
                        }),
                        label: `${selectedView.label} Copy`,
                        source: selectedView.source,
                        params: selectedView.params ?? {},
                      };

                      setDraft(duplicated);
                      setSelectedId(duplicated.id);
                    }}
                    type="button"
                  >
                    Duplicate
                  </Button>
                  <Button
                    onClick={closeEditor}
                    type="button"
                    variant="secondary"
                  >
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={async () => {
                      if (!editableView) return;

                      const existing = storage.custom.filter(
                        (view) => view.id !== editableView.id
                      );
                      const nextView = {
                        ...editableView,
                        id: createViewId({
                          existingIds: views
                            .filter((view) => view.id !== editableView.id)
                            .map((view) => view.id),
                          label: editableView.id || editableView.label,
                          source: editableView.source,
                        }),
                      };

                      await saveCustomViews([...existing, nextView]);
                      setDraft(null);
                      setSelectedId(nextView.id);
                      setEditorOpen(false);
                    }}
                    type="button"
                  >
                    Save
                  </Button>
                  {isPersistedCustomView && (
                    <Button
                      onClick={async () => {
                        if (!selectedView || selectedView.builtIn) return;
                        if (selectedUsageCount > 0) return;

                        await saveCustomViews(
                          storage.custom.filter(
                            (view) => view.id !== selectedView.id
                          )
                        );
                        setDraft(null);
                        setSelectedId(
                          views.filter((view) => view.id !== selectedView.id)[0]
                            ?.id ?? null
                        );
                        setEditorOpen(false);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    onClick={closeEditor}
                    type="button"
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </SidebarSection>
  );
}
