"use client";

import { useEffect, useMemo, useState } from "react";
import { AutoField, Button } from "@puckeditor/core";
import type { Field } from "@puckeditor/core";

import getClassNameFactory from "../../../../core/lib/get-class-name-factory";

import {
  loadResolvedViewData,
  getViewValueOptions,
  isCompatibleFieldBinding,
} from "../../lib/views";
import { getPathToClosestWildcard } from "../../lib/get-path-to-closest-wildcard";
import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import type {
  NodeViewBinding,
  ViewValueOption,
  ViewsPluginOptions,
} from "../../types";

import { Loader } from "../Loader";
import { Modal } from "../Modal";

import styles from "./style.module.css";

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
    )?.expression ?? `${binding.path || "Unknown binding"}`
  );
};

export type BindingControlProps = {
  /** Static path to the field (e.g. "items[0].subItems[1].name") defined by Puck `name` */
  path: string;
  /** Puck field definition for the field */
  field: Field;
  /** The current bindings for the component where the field is defined */
  bindings: Record<string, NodeViewBinding>;
  /** Callback function to handle changes to the bindings */
  onChange: (
    newComponentBindings: Record<string, NodeViewBinding>,
    newFieldBinding: NodeViewBinding | null
  ) => void;
  /** Options provided for the plugin when creating it */
  options: ViewsPluginOptions;
  /** Whether the control is disabled, this doesn't affect the field itself */
  disabled?: boolean;
};

/**
 * Renders the control to manage connection of a field to view data.
 *
 * The control will look for compatible view data based on the field type and allow the user to connect or disconnect the field to a specific piece of view data.
 */
export function BindingControl({
  path,
  field,
  bindings,
  onChange,
  options,
  disabled,
}: BindingControlProps) {
  const { root } = useCurrentNodeEditor();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [valueOptions, setValueOptions] = useState<ViewValueOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The field path includes static indexes (e.g. "items[0].subItems[1].name") but the binding might be on a wildcard ancestor
  // (e.g. "items[*].subItems[1].name"), so we need to convert it to wildcard format before looking for the binding and storing it
  const closestArrayBindingKey = getPathToClosestWildcard(
    path,
    Object.keys(bindings)
  );

  const matchWildcardReg = closestArrayBindingKey
    ? new RegExp(
        `^${closestArrayBindingKey
          .replace(/\./g, "\\.")
          .replace(/\[\*\]/g, "\\[(\\d+|\\*)\\]")
          .replace(/\[(\d+)\]/g, "\\[$1\\]")}`
      )
    : null;

  // If this field lives under an array binding, replace the static part of the path with the closest wildcard ancestor
  // (items[1] -> items[*]) so that it can match the existing binding
  const resolvedBindingKey =
    matchWildcardReg && closestArrayBindingKey
      ? path.replace(matchWildcardReg, closestArrayBindingKey)
      : path;

  const fieldBinding: NodeViewBinding | undefined =
    bindings[resolvedBindingKey];

  // AutoField recreates the field object on every render, so we need to memoize the relevant properties to avoid refetching data on every render
  const fieldType = field.type;
  const fieldOptions =
    field.type === "select" || field.type === "radio"
      ? field.options
      : undefined;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    loadResolvedViewData({
      root,
      options,
    })
      .then((viewsById) => {
        if (!active) {
          return;
        }

        const allOptions = getViewValueOptions({
          viewsById: viewsById ?? {},
        }).filter((option) =>
          isCompatibleFieldBinding({
            field: {
              type: fieldType,
              options: fieldOptions,
            },
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
    fieldType,
    fieldOptions,
    isOpen,
    options.builtInViews,
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

  // Filter the options to only those that are nested under the closest array binding
  const closestArrayBinding = closestArrayBindingKey
    ? bindings[closestArrayBindingKey]
    : null;

  const matchingOptions = useMemo(() => {
    if (!closestArrayBinding) return filteredOptions;

    const normalizedOptions = filteredOptions
      .map((option) => {
        const wildcardBindingPath = closestArrayBinding.path;

        const matchWildcardReg = new RegExp(
          `^${wildcardBindingPath
            .replace(/\[\*\]/g, "\\[\\d+\\]")
            .replace(/\[(\d+)\]/g, "\\[$1\\]")}`
        );

        const isMatch = matchWildcardReg.test(option.path);

        if (!isMatch) return null;

        if (option.expression === wildcardBindingPath) return null; // We don't want to show the exact same binding as an option

        const wildcardPath = option.path.replace(
          matchWildcardReg,
          wildcardBindingPath
        );

        if (wildcardPath.startsWith(fieldBinding?.path)) return null; // We don't want to show options that would create a circular binding

        const formattedResult = {
          ...option,
          preview: "Connect every item to this data",
          path: wildcardPath,
          expression: wildcardPath,
        };

        return formattedResult;
      })
      .filter((option) => option !== null);

    const uniqueOptions = new Map<string, ViewValueOption>();
    normalizedOptions.forEach((option) => {
      if (!uniqueOptions.has(option.expression)) {
        uniqueOptions.set(option.expression, option);
      }
    });

    return Array.from(uniqueOptions.values());
  }, [filteredOptions]);

  return (
    <>
      <button
        className={getClassName()}
        disabled={disabled && !fieldBinding}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        type="button"
      >
        {getBindingLabel(fieldBinding, valueOptions)}
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
          <div
            className={[
              getClassName("modalContent"),
              !(!loading && !error && matchingOptions.length > 0)
                ? getClassName("stateBox")
                : "",
            ].join(" ")}
          >
            {loading && <Loader size={18} />}
            {!loading && error && error}
            {!loading &&
              !error &&
              matchingOptions.length === 0 &&
              "No compatible view data."}
            {!loading &&
              !error &&
              matchingOptions.length > 0 &&
              matchingOptions
                .sort((a, b) => a.expression.localeCompare(b.expression))
                .map((option) => (
                  <button
                    className={getClassName("optionButton")}
                    key={`${option.viewId}:${option.path}`}
                    onClick={() => {
                      const newBindings = { ...bindings };

                      newBindings[resolvedBindingKey] = {
                        viewId: option.viewId,
                        path: option.path,
                      };

                      onChange(newBindings, newBindings[resolvedBindingKey]);
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
          <div className={getClassName("modalFooter")}>
            {fieldBinding && (
              <Button
                onClick={() => {
                  const newBindings = { ...bindings };

                  // delete the current binding and any wildcard bindings that would also match this path,
                  // to avoid leaving orphaned wildcard bindings that might still match the field after the specific binding is deleted
                  Object.keys(newBindings).forEach((bindingKey) => {
                    if (bindingKey.startsWith(resolvedBindingKey)) {
                      delete newBindings[bindingKey];
                    }
                  });

                  onChange(newBindings, null);
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
