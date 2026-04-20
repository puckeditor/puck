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

import ViewOption, { ViewOptionProps } from "./components/view-option";
import styles from "./style.module.css";

const getClassName = getClassNameFactory("BindingControl", styles);

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

  // AutoField recreates the field object on every render, so we need to memoize the relevant properties to avoid refetching data on every render
  const fieldType = field.type;
  const fieldOptions =
    field.type === "select" || field.type === "radio"
      ? field.options
      : undefined;

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

  const createNewBinding: ViewOptionProps["onConnect"] = (newOption) => {
    const newBindings = { ...bindings };

    newBindings[resolvedBindingKey] = {
      viewId: newOption.viewId,
      path: newOption.path,
    };

    // delete any static bindings that would be overridden by this new wildcard binding
    // to avoid leaving orphaned bindings
    Object.keys(newBindings).forEach((bindingKey) => {
      const matchResolvedBindingKey = new RegExp(
        `^${resolvedBindingKey
          .replace(/\./g, "\\.")
          .replace(/\[\*\]/g, "\\[(\\d+)\\]")}`
      );

      if (
        bindingKey !== resolvedBindingKey &&
        matchResolvedBindingKey.test(bindingKey)
      ) {
        delete newBindings[bindingKey];
      }
    });

    onChange(newBindings, newBindings[resolvedBindingKey]);
    setOpen(false);
    setQuery("");
  };

  const deleteBinding = () => {
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
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    const loadOptions = async () => {
      setLoading(true);
      setError(null);

      try {
        const viewsById = await loadResolvedViewData({
          root,
          options,
        });

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
      } catch {
        if (!active) {
          return;
        }

        setError("Could not load view data.");
        setValueOptions([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadOptions();

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

  // Query view options by path or value
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return valueOptions;
    }

    return valueOptions.filter(
      (option) =>
        option.path.toLowerCase().includes(normalizedQuery) ||
        option.preview.toLowerCase().includes(normalizedQuery)
    );
  }, [query, valueOptions]);

  // Filter view options to only those that are nested under the closest array binding
  const closestArrayBinding = closestArrayBindingKey
    ? bindings[closestArrayBindingKey]
    : null;

  const matchingOptions = useMemo(() => {
    if (!closestArrayBinding) return filteredOptions;

    // Convert static paths to wildcard paths based on the closest array binding
    const normalizedOptions: ViewValueOption[] = [];

    filteredOptions.forEach((option) => {
      const closestArrayPath = closestArrayBinding.path;

      if (closestArrayBinding.viewId !== option.viewId) {
        return;
      }

      const matchClosestArrayPath = new RegExp(
        `^${closestArrayPath
          .replace(/\./g, "\\.")
          .replace(/\[\*\]/g, "\\[\\d+\\]")
          .replace(/\[(\d+)\]/g, "\\[$1\\]")}`
      );

      const isMatch = matchClosestArrayPath.test(option.path);

      if (!isMatch) return;

      // Don't show the exact same binding as an option
      if (option.path === closestArrayPath) return;

      const pathWithArrayBinding = option.path.replace(
        matchClosestArrayPath,
        closestArrayPath
      );

      const formattedOption = {
        ...option,
        path: pathWithArrayBinding,
        expression: pathWithArrayBinding,
      };

      // Don't show options that would create a circular binding
      if (pathWithArrayBinding.startsWith(fieldBinding?.path)) return;

      normalizedOptions.push(formattedOption);
    });

    // Group any array binding view options that resolve to same path (i.g. "items[*].name")
    const groupedOptions = new Map<string, ViewValueOption[]>();

    normalizedOptions.forEach((option) => {
      if (!groupedOptions.has(option.path)) {
        groupedOptions.set(option.path, [option]);
      } else {
        groupedOptions.get(option.path)?.push(option);
      }
    });

    // Merge array binding view options that share the same path into a single option
    // with multiple possible values to preview in the UI
    let uniqueOptions: ViewValueOption[] = [];

    groupedOptions.forEach((value) => {
      const firstValue = value[0];

      if (!firstValue) return;

      uniqueOptions.push({
        ...firstValue,
        value: value.map((value) => ({
          value: value.value,
        })),
      });
    });

    return uniqueOptions.sort((a, b) => a.path.localeCompare(b.path));
  }, [filteredOptions]);

  const loader = loading && <Loader size={18} />;

  const errorMessage = !loading && error;

  const noViewOptions =
    !loading &&
    !error &&
    matchingOptions.length === 0 &&
    "No compatible view data.";

  const viewOptionList =
    !loading &&
    !error &&
    matchingOptions.length > 0 &&
    matchingOptions.map((option) => (
      <ViewOption
        key={`${option.viewId}:${option.path}`}
        option={option}
        onConnect={createNewBinding}
      />
    ));

  return (
    <>
      <button
        className={getClassName({ connected: !!fieldBinding })}
        disabled={disabled && !fieldBinding}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        type="button"
      >
        {fieldBinding ? "Connected" : "Connect"}
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
            {loader}
            {errorMessage}
            {noViewOptions}
            {viewOptionList}
          </div>
          <div className={getClassName("modalFooter")}>
            {fieldBinding && (
              <Button onClick={deleteBinding} type="button" variant="secondary">
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
