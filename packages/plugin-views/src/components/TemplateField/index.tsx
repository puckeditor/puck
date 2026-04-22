"use client";

import { AutoField, FieldLabel, setDeep } from "@puckeditor/core";
import type { Field } from "@puckeditor/core";
import { useEffect, useMemo, useState } from "react";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import { BindingControl } from "../BindingControl";
import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import {
  RENDER_DATA_BINDING_KEY,
  getTemplateStorageKey,
  getNodeViewState,
  getTemplateFragment,
  getViewValueOptions,
  insertTemplateExpression,
  isValidTemplateForFieldPath,
  loadResolvedViewData,
  setNodeViewState,
  isCompatibleFieldBinding,
  getWildcardFieldPath,
} from "../../lib/views";
import {
  getWildcardPathRegExp,
  getPathToClosestWildcard,
} from "../../lib/strings/paths";
import { isTemplateString } from "../../lib/strings/templates";
import type {
  NodeViewState,
  ViewValueOption,
  ViewsPluginOptions,
} from "../../types";
import styles from "./style.module.css";

const getClassName = getClassNameFactory("TemplateField", styles);

const getDisplayValue = ({
  value,
  template,
}: {
  value: any;
  template?: string;
}) => {
  if (typeof template === "string") {
    return template;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "undefined" || value === null) {
    return "";
  }

  return String(value);
};

const getWildcardCount = (value: string, partial = false) => {
  let completeWildcardsCount = value.match(/\[\*\]/g)?.length ?? 0;

  if (value.endsWith("[*") && partial) {
    completeWildcardsCount += 1;
  }

  return completeWildcardsCount;
};

const normalizeTemplateSearch = (value: string) => value.toLowerCase();

/**
 * Wraps a Puck text field and provides a toolbar and template editing capabilities for binding it to a view.
 */
export function TemplateField({
  field,
  name,
  readOnly,
  value,
  options,
}: {
  field: Field;
  name: string;
  readOnly?: boolean;
  value: any;
  options: ViewsPluginOptions;
}) {
  const { currentId, currentProps, replaceProps, root } =
    useCurrentNodeEditor();
  const nodeState = getNodeViewState({
    props: currentProps,
    nodeStateKey: options.nodeStateKey,
  });
  const wildcardFieldPath = getWildcardFieldPath({
    fieldPath: name,
    bindings: nodeState.bindings,
  });
  const binding =
    nodeState.bindings[wildcardFieldPath] || nodeState.bindings[name];
  const template =
    nodeState.templates[wildcardFieldPath] ||
    nodeState.templates[name] ||
    (typeof value === "string" && isTemplateString(value) ? value : undefined);
  const [isFocused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<ViewValueOption[]>([]);

  const inputField = useMemo<Field>(
    () => ({
      ...field,
      label: field.label ?? name,
      metadata: {
        ...field.metadata,
        // Set to false to avoid infinite recursion since we use AutoField which invokes the override
        [RENDER_DATA_BINDING_KEY]: false,
      },
    }),
    [field, name]
  );

  useEffect(() => {
    if (!isFocused || binding) {
      return;
    }

    let active = true;

    async function loadViewData() {
      try {
        const viewsById = await loadResolvedViewData({
          root,
          options,
        });

        if (!active) {
          return;
        }

        const suggestion = getViewValueOptions({
          viewsById: viewsById ?? {},
        }).filter((option) =>
          isCompatibleFieldBinding({
            field: {
              type: field.type,
            },
            option,
          })
        );

        setSuggestions(suggestion);
      } catch (error) {
        if (active) {
          setSuggestions([]);
        }
      }
    }

    loadViewData();

    return () => {
      active = false;
    };
  }, [
    field.type,
    binding,
    isFocused,
    options.builtInViews,
    options.sources,
    options.storageKey,
    root,
  ]);

  const displayValue = getDisplayValue({ value, template });

  // TODO: Get cursor position and pass it through to open the suggestion list on non end of input templates
  const fragment =
    isFocused && !binding
      ? getTemplateFragment({
          value: displayValue,
        })
      : null;

  const filteredSuggestions = useMemo(() => {
    if (!fragment) {
      return [];
    }

    const normalized = normalizeTemplateSearch(fragment.query.trim());

    const finalSuggestions = suggestions.filter((option) =>
      !normalized
        ? true
        : normalizeTemplateSearch(option.path).includes(normalized)
    );

    const closestArrayBindingKey = getPathToClosestWildcard(
      name,
      Object.keys(nodeState.bindings)
    );
    const closestArrayBinding = closestArrayBindingKey
      ? nodeState.bindings[closestArrayBindingKey]
      : null;
    const fragmentWildcardCount = getWildcardCount(fragment.query, true);

    if (!closestArrayBinding) {
      return finalSuggestions.slice(0, 8);
    }

    const requiredWildcardCount = getWildcardCount(closestArrayBinding.path);

    if (fragmentWildcardCount > requiredWildcardCount) {
      return [];
    }

    const groupedOptions = new Map<string, ViewValueOption>();
    const matchClosestArrayPath = getWildcardPathRegExp(
      closestArrayBinding.path,
      "\\d+"
    );

    suggestions.forEach((option) => {
      if (
        option.viewId !== closestArrayBinding.viewId ||
        !matchClosestArrayPath.test(option.path)
      ) {
        return;
      }

      const wildcardPath = option.path.replace(
        matchClosestArrayPath,
        closestArrayBinding.path
      );

      if (!groupedOptions.has(wildcardPath)) {
        groupedOptions.set(wildcardPath, {
          ...option,
          path: wildcardPath,
          expression: wildcardPath,
        });
      }
    });

    groupedOptions.forEach((option) => {
      if (!normalized) {
        finalSuggestions.push(option);
        return;
      }

      if (normalizeTemplateSearch(option.path).includes(normalized)) {
        finalSuggestions.push(option);
      }
    });

    return finalSuggestions
      .sort((a, b) => {
        const containsWildCardA = a.path.includes("[*]");
        const containsWildCardB = b.path.includes("[*]");

        if (containsWildCardA && !containsWildCardB) {
          return -1;
        }

        if (!containsWildCardA && containsWildCardB) {
          return 1;
        }

        return a.path.localeCompare(b.path);
      })
      .slice(0, 8);
  }, [fragment, name, nodeState.bindings, suggestions]);

  const updateNodeState = (
    nextValue: string,
    updateState: (nodeState: NodeViewState) => NodeViewState
  ) => {
    let nextProps = setDeep({ ...currentProps }, name, nextValue);

    nextProps = setNodeViewState({
      props: nextProps,
      nodeState: updateState(nodeState),
      nodeStateKey: options.nodeStateKey,
    });

    replaceProps(nextProps);
  };

  const getNextTemplateState = (
    currentNodeState: NodeViewState,
    nextValue: string
  ) => {
    const nextNodeState: NodeViewState = {
      templates: {
        ...currentNodeState.templates,
      },
      bindings: {
        ...currentNodeState.bindings,
      },
    };
    const currentWildcardFieldPath = getWildcardFieldPath({
      fieldPath: name,
      bindings: currentNodeState.bindings,
    });

    delete nextNodeState.templates[name];
    delete nextNodeState.templates[currentWildcardFieldPath];

    if (
      isTemplateString(nextValue) &&
      isValidTemplateForFieldPath({
        fieldPath: name,
        template: nextValue,
        bindings: currentNodeState.bindings,
      })
    ) {
      nextNodeState.templates[
        getTemplateStorageKey({
          fieldPath: name,
          template: nextValue,
          bindings: currentNodeState.bindings,
        })
      ] = nextValue;
    }

    return nextNodeState;
  };

  return (
    <div className={getClassName()}>
      <FieldLabel
        icon={field.labelIcon}
        label={field.label ?? name}
        readOnly={readOnly || !!binding}
      >
        <div
          className={getClassName("field")}
          onBlurCapture={(event) => {
            const nextFocused = event.relatedTarget as Node | null;

            if (nextFocused && event.currentTarget.contains(nextFocused)) {
              return;
            }

            setFocused(false);
          }}
          onFocusCapture={() => setFocused(true)}
        >
          <div
            className={getClassName("input")}
            data-has-template={template ? "true" : "false"}
          >
            <AutoField
              field={inputField}
              onChange={(nextValue) => {
                const normalizedValue =
                  typeof nextValue === "string" ? nextValue : "";

                updateNodeState(normalizedValue, (currentNodeState) =>
                  getNextTemplateState(currentNodeState, normalizedValue)
                );
              }}
              readOnly={readOnly || !!binding}
              value={displayValue}
            />
            {fragment && filteredSuggestions.length > 0 && (
              <div className={getClassName("suggestionList")}>
                {filteredSuggestions.map((option) => (
                  <button
                    className={getClassName("suggestionButton")}
                    key={option.path}
                    onMouseDown={async (event) => {
                      event.preventDefault();

                      const inserted = insertTemplateExpression({
                        value: displayValue,
                        expression: option.expression,
                      });

                      updateNodeState(inserted.value, (currentNodeState) =>
                        getNextTemplateState(currentNodeState, inserted.value)
                      );
                    }}
                    type="button"
                  >
                    <div className={getClassName("suggestionTitle")}>
                      {option.expression}
                    </div>
                    <div className={getClassName("suggestionPreview")}>
                      {option.path}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={getClassName("toolbar")}>
            <BindingControl
              nodeViewState={nodeState}
              path={name}
              disabled={readOnly && !binding}
              field={field}
              onChange={(nextNodeState) => {
                replaceProps(
                  setNodeViewState({
                    props: currentProps,
                    nodeState: nextNodeState,
                    nodeStateKey: options.nodeStateKey,
                  })
                );
              }}
              options={options}
            />
          </div>
        </div>
      </FieldLabel>
    </div>
  );
}
