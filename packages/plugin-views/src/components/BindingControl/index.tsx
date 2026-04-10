"use client";

import { AutoField, Button } from "@puckeditor/core";
import type { Field } from "@puckeditor/core";
import { useEffect, useMemo, useState } from "react";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import {
  getResolvedViews,
  getViewValueOptions,
  isCompatibleFieldBinding,
  queryResolvedView,
  toRootComponent,
} from "../../lib/views";
import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import type {
  NodeViewBinding,
  ViewValueOption,
  ViewsPluginOptions,
} from "../../types";
import styles from "./style.module.css";
import { Loader } from "../Loader";
import { Modal } from "../Modal";

const getClassName = getClassNameFactory("BindingControl", styles);

const getBindingLabel = (
  binding: NodeViewBinding | null | undefined,
  options: ViewValueOption[]
) => {
  if (!binding) {
    return "Connect";
  }

  return (
    options.find(
      (option) =>
        option.viewId === binding.viewId && option.path === (binding.path || "")
    )?.expression ??
    `${binding.viewId}${binding.path ? `.${binding.path}` : ""}`
  );
};

export function BindingControl({
  field,
  binding,
  onChange,
  options,
  disabled,
}: {
  field: Field;
  binding?: NodeViewBinding;
  onChange: (binding: NodeViewBinding | null) => void;
  options: ViewsPluginOptions;
  disabled?: boolean;
}) {
  const { root } = useCurrentNodeEditor();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [valueOptions, setValueOptions] = useState<ViewValueOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    const rootComponent = toRootComponent(root);
    const views = getResolvedViews({
      root: rootComponent,
      builtInViews: options.builtInViews,
      storageKey: options.storageKey,
    });

    Promise.all(
      views.map(async (view) => [
        view.id,
        await queryResolvedView({
          view,
          sources: options.sources,
          root: rootComponent,
        }),
      ])
    )
      .then((entries) => {
        if (!active) {
          return;
        }

        const allOptions = getViewValueOptions({
          viewsById: Object.fromEntries(entries),
        }).filter((option) =>
          isCompatibleFieldBinding({
            field,
            option,
          })
        );

        setValueOptions(allOptions);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setError("Could not load view data.");
        setValueOptions([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    field,
    isOpen,
    options.builtInViews,
    options.nodeStateKey,
    options.sources,
    options.storageKey,
    root,
  ]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return valueOptions;
    }

    return valueOptions.filter((option) =>
      option.expression.toLowerCase().includes(normalizedQuery)
    );
  }, [query, valueOptions]);

  return (
    <>
      <button
        className={getClassName()}
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        type="button"
      >
        {getBindingLabel(binding, valueOptions)}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
      >
        <div className={getClassName("modal")}>
          <div className={getClassName("modalHeader")}>
            <h3 className={getClassName("modalTitle")}>Connect field</h3>
            <AutoField
              field={{
                type: "text",
                placeholder: "Filter view data",
              }}
              id="views-binding-search"
              onChange={(nextValue) => setQuery(nextValue || "")}
              value={query}
            />
          </div>
          <div>
            {loading && (
              <div className={getClassName("stateBox")}>
                <Loader size={18} />
              </div>
            )}
            {!loading && error && (
              <div className={getClassName("stateBox")}>{error}</div>
            )}
            {!loading && !error && filteredOptions.length === 0 && (
              <div className={getClassName("stateBox")}>
                No compatible view data.
              </div>
            )}
            {!loading && !error && filteredOptions.length > 0 && (
              <div className={getClassName("optionList")}>
                {filteredOptions.map((option) => (
                  <button
                    className={getClassName("optionButton")}
                    key={`${option.viewId}:${option.path}`}
                    onClick={() => {
                      onChange({
                        viewId: option.viewId,
                        path: option.path,
                      });
                      setOpen(false);
                      setQuery("");
                    }}
                    type="button"
                  >
                    <div className={getClassName("optionTitle")}>
                      {option.expression}
                    </div>
                    <div className={getClassName("optionPreview")}>
                      {option.preview}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={getClassName("modalFooter")}>
            {binding && (
              <Button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQuery("");
                }}
                type="button"
                variant="secondary"
              >
                Disconnect
              </Button>
            )}
            <Button
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              type="button"
              variant="secondary"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
