"use client";

import { useEffect, useMemo, useState } from "react";
import { Database } from "lucide-react";
import { AutoField, Button, FieldLabel } from "@puckeditor/core";
import type { Field } from "@puckeditor/core";

import getClassNameFactory from "../../../../core/lib/get-class-name-factory";

import type { CustomView, ViewsPluginOptions } from "../../types";
import {
  getCustomViews,
  getViewData,
  getViews,
  clearQueryCache,
  setViews,
  createViewId,
} from "../../lib/views";
import { countViewUsage } from "../../lib/bindings";
import { toRootComponent } from "../../lib/puck/to-root-component";
import { sanitizeId } from "../../lib/utils/sanitize-id";
import usePuck from "../../hooks/use-puck";
import getAllComponentIds from "../../lib/puck/get-all-component-ids";

import { SidebarSection } from "../SidebarSection";
import { Loader } from "../Loader";
import { Modal } from "../Modal";
import DataTable from "../DataTable";
import ObjectField from "../ObjectField";

import styles from "./style.module.css";

const getClassName = getClassNameFactory("ViewsPluginPanel", styles);

export function ViewsPluginPanel({ options }: { options: ViewsPluginOptions }) {
  const puckData = usePuck((s) => s.appState.data);
  const config = usePuck((s) => s.config);
  const dispatch = usePuck((s) => s.dispatch);
  const resolveDataById = usePuck((s) => s.resolveDataById);
  const rootComponent = useMemo(
    () => toRootComponent(puckData.root),
    [puckData.root]
  );
  const storage = useMemo(
    () =>
      getCustomViews({
        root: puckData.root,
        storageKey: options.storageKey,
      }),
    [puckData.root, options.storageKey]
  );
  const views = useMemo(
    () =>
      getViews({
        root: puckData.root,
        builtInViews: options.builtInViews,
        storageKey: options.storageKey,
      }),
    [puckData.root, options.builtInViews, options.storageKey]
  );
  const usageCounts = useMemo(
    () =>
      countViewUsage({
        data: puckData,
        config,
        nodeStateKey: options.nodeStateKey,
      }),
    [puckData, config, options.nodeStateKey]
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

    getViewData({
      view: {
        id: previewView.id,
        source: previewView.source,
        params: previewView.params,
      },
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
  }, [
    isEditorOpen,
    options.sources,
    previewView?.id,
    previewView?.source,
    previewView?.params,
    rootComponent,
  ]);

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

  let paramsField: Field | null = null;

  if (editableView && options.sources[editableView.source]) {
    paramsField = {
      type: "object",
      objectFields: options.sources[editableView.source].fields,
    };
  } else if (selectedView && options.sources[selectedView.source]) {
    paramsField = {
      type: "object",
      objectFields: options.sources[selectedView.source].fields,
    };
  }

  const selectedUsageCount = selectedView
    ? usageCounts[selectedView.id] || 0
    : 0;

  const refreshAll = async () => {
    clearQueryCache();

    await Promise.resolve(resolveDataById("root", "force"));

    // TODO: This is not a good a approach we should use resolveAllData instead if possible
    await Promise.all(
      getAllComponentIds({
        data: puckData,
        config,
      }).map((id) => Promise.resolve(resolveDataById(id, "force")))
    );
  };

  const saveCustomViews = async (nextCustomViews: CustomView[]) => {
    dispatch({
      type: "replaceRoot",
      root: setViews({
        root: puckData.root,
        storageKey: options.storageKey,
        storage: {
          custom: nextCustomViews,
        },
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

                      const normalizedId = sanitizeId(nextId || "");

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
                  <ObjectField
                    name="Filters"
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
                    <DataTable
                      data={previewData}
                      className={getClassName("previewTable")}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className={getClassName("modalFooter")}>
              {!selectedView.builtIn && selectedUsageCount > 0 && (
                <div className={getClassName("helperText")}>
                  This view is referenced {selectedUsageCount} time
                  {selectedUsageCount === 1 ? "" : "s"} and cannot be deleted.
                </div>
              )}
              <div className={getClassName("modalActions")}>
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
                        disabled={selectedUsageCount > 0}
                        onClick={async () => {
                          if (!selectedView || selectedView.builtIn) return;
                          if (selectedUsageCount > 0) return;

                          setEditorOpen(false);
                          await saveCustomViews(
                            storage.custom.filter(
                              (view) => view.id !== selectedView.id
                            )
                          );
                          setDraft(null);
                          setSelectedId(
                            views.filter(
                              (view) => view.id !== selectedView.id
                            )[0]?.id ?? null
                          );
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
          </div>
        ) : null}
      </Modal>
    </SidebarSection>
  );
}
