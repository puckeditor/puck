"use client";

import type { ReactNode } from "react";
import type { Field } from "@puckeditor/core";

import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import { getNodeViewState, setNodeViewState } from "../../lib/views";
import type { NodeViewState, ViewsPluginOptions } from "../../types";

import { BindingControl } from "../BindingControl";

import styles from "./style.module.css";

const getClassName = getClassNameFactory("FieldEnhancer", styles);

/**
 * Wraps a Puck field and provides a toolbar for binding it to a view.
 */
export function FieldEnhancer({
  children,
  field,
  name,
  options,
  readOnly,
}: {
  children: ReactNode;
  field: Field;
  name: string;
  options: ViewsPluginOptions;
  readOnly?: boolean;
}) {
  const { currentProps, replaceProps } = useCurrentNodeEditor();
  const nodeState = getNodeViewState({
    props: currentProps,
    nodeStateKey: options.nodeStateKey,
  });

  const bindingKey = `${name}${field.type === "array" ? "[*]" : ""}`;

  return (
    <div className={getClassName()}>
      {children}
      <div className={getClassName("toolbar")}>
        <BindingControl
          path={bindingKey}
          bindings={nodeState.bindings}
          disabled={readOnly}
          field={field}
          onChange={(nextBindings) => {
            const nextNodeState: NodeViewState = {
              templates: {
                ...nodeState.templates,
              },
              bindings: nextBindings,
            };

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
  );
}
