"use client";

import { AutoField, FieldLabel, setDeep } from "@puckeditor/core";
import type { Field } from "@puckeditor/core";
import { useEffect, useMemo, useState } from "react";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import { BindingControl } from "../BindingControl";
import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import {
  RENDER_DATA_BINDING_KEY,
  getNodeViewState,
  getResolvedViews,
  getTemplateFragment,
  getViewValueOptions,
  insertTemplateExpression,
  isTemplateString,
  queryResolvedView,
  setNodeViewState,
  toRootComponent,
} from "../../lib/views";
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
  const binding = nodeState.bindings[name];
  const template =
    nodeState.templates[name] ||
    (typeof value === "string" && isTemplateString(value) ? value : undefined);
  const [isFocused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<ViewValueOption[]>([]);

  const fieldId = useMemo(
    () => `views-template-${currentId}-${name}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    [currentId, name]
  );
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
  const getInputElement = () =>
    document.getElementById(fieldId) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

  useEffect(() => {
    if (!isFocused || binding) {
      return;
    }

    let active = true;
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

        setSuggestions(
          getViewValueOptions({
            viewsById: Object.fromEntries(entries),
          })
        );
      })
      .catch(() => {
        if (active) {
          setSuggestions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [
    binding,
    isFocused,
    options.builtInViews,
    options.sources,
    options.storageKey,
    root,
  ]);

  const displayValue = getDisplayValue({ value, template });
  const cursor = getInputElement()?.selectionStart ?? displayValue.length;
  const fragment =
    isFocused && !binding
      ? getTemplateFragment({
          value: displayValue,
          cursor,
        })
      : null;
  const filteredSuggestions = useMemo(() => {
    if (!fragment) {
      return [];
    }

    const normalized = fragment.query.trim().toLowerCase();

    return suggestions
      .filter((option) =>
        ["string", "number", "boolean", "null"].includes(option.valueType)
      )
      .filter((option) =>
        !normalized
          ? true
          : option.expression.toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }, [fragment, suggestions]);

  const updateNodeState = async (
    nextValue: string,
    updateState: (nodeState: NodeViewState) => NodeViewState
  ) => {
    let nextProps = setDeep({ ...currentProps }, name, nextValue);

    nextProps = setNodeViewState({
      props: nextProps,
      nodeState: updateState(nodeState),
      nodeStateKey: options.nodeStateKey,
    });

    await replaceProps(nextProps);
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
              id={fieldId}
              onChange={async (nextValue) => {
                const normalizedValue =
                  typeof nextValue === "string" ? nextValue : "";

                await updateNodeState(normalizedValue, (currentNodeState) => {
                  const nextNodeState: NodeViewState = {
                    templates: {
                      ...currentNodeState.templates,
                    },
                    bindings: {
                      ...currentNodeState.bindings,
                    },
                  };

                  if (isTemplateString(normalizedValue)) {
                    nextNodeState.templates[name] = normalizedValue;
                  } else {
                    delete nextNodeState.templates[name];
                  }

                  return nextNodeState;
                });
              }}
              readOnly={readOnly || !!binding}
              value={displayValue}
            />
            {fragment && filteredSuggestions.length > 0 && (
              <div className={getClassName("suggestionList")}>
                {filteredSuggestions.map((option) => (
                  <button
                    className={getClassName("suggestionButton")}
                    key={option.expression}
                    onMouseDown={async (event) => {
                      event.preventDefault();

                      const inserted = insertTemplateExpression({
                        value: displayValue,
                        cursor,
                        expression: option.expression,
                      });

                      await updateNodeState(
                        inserted.value,
                        (currentNodeState) => ({
                          templates: {
                            ...currentNodeState.templates,
                            [name]: inserted.value,
                          },
                          bindings: {
                            ...currentNodeState.bindings,
                          },
                        })
                      );

                      window.setTimeout(() => {
                        const inputElement = getInputElement();

                        inputElement?.focus();
                        inputElement?.setSelectionRange(
                          inserted.cursor,
                          inserted.cursor
                        );
                      }, 0);
                    }}
                    type="button"
                  >
                    <div className={getClassName("suggestionTitle")}>
                      {option.expression}
                    </div>
                    <div className={getClassName("suggestionPreview")}>
                      {option.preview}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={getClassName("toolbar")}>
            <BindingControl
              binding={binding}
              disabled={readOnly && !binding}
              field={field}
              onChange={async (nextBinding) => {
                await updateNodeState(displayValue, (currentNodeState) => {
                  const nextNodeState: NodeViewState = {
                    templates: {
                      ...currentNodeState.templates,
                    },
                    bindings: {
                      ...currentNodeState.bindings,
                    },
                  };

                  delete nextNodeState.templates[name];

                  if (nextBinding) {
                    nextNodeState.bindings[name] = nextBinding;
                  } else {
                    delete nextNodeState.bindings[name];
                  }

                  return nextNodeState;
                });
              }}
              options={options}
            />
          </div>
        </div>
      </FieldLabel>
    </div>
  );
}
