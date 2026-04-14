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

export function FieldEnhancer({
  children,
  field,
  name,
  options,
  isArray,
  readOnly,
}: {
  children: ReactNode;
  field: Field;
  name: string;
  options: ViewsPluginOptions;
  isArray?: boolean;
  readOnly?: boolean;
}) {
  const { currentProps, replaceProps } = useCurrentNodeEditor();
  const nodeState = getNodeViewState({
    props: currentProps,
    nodeStateKey: options.nodeStateKey,
  });

  const bindingKey = `${name}${isArray ? "[*]" : ""}`;

  const binding = nodeState.bindings[bindingKey];

  return (
    <div className={getClassName()}>
      {children}
      <div className={getClassName("toolbar")}>
        <BindingControl
          binding={binding}
          disabled={readOnly && !binding}
          field={field}
          onChange={(nextBinding) => {
            const nextNodeState: NodeViewState = {
              templates: {
                ...nodeState.templates,
              },
              bindings: {
                ...nodeState.bindings,
              },
            };

            if (nextBinding) {
              nextNodeState.bindings[bindingKey] = nextBinding;
            } else {
              delete nextNodeState.bindings[bindingKey];
            }

            replaceProps(
              setNodeViewState({
                props: currentProps,
                nodeState: nextNodeState,
                nodeStateKey: options.nodeStateKey,
              }),
              { [name]: Boolean(nextBinding) }
            );
          }}
          options={options}
        />
      </div>
    </div>
  );
}
