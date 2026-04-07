"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { Field } from "@puckeditor/core";
import getClassNameFactory from "../../../../core/lib/get-class-name-factory";
import { BindingControl } from "../BindingControl";
import { getNodeViewState, setNodeViewState } from "../../lib/views";
import { useCurrentNodeEditor } from "../../hooks/use-current-node-editor";
import { useShowBindingControls } from "../../hooks/use-show-binding-controls";
import type { NodeViewState, ViewsPluginOptions } from "../../types";
import styles from "./style.module.css";

const getClassName = getClassNameFactory("FieldEnhancer", styles);

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
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const nodeState = getNodeViewState({
    props: currentProps,
    nodeStateKey: options.nodeStateKey,
  });
  const binding = nodeState.bindings[name];
  const showBindingControls = useShowBindingControls(container);

  return (
    <div className={getClassName()} ref={setContainer}>
      {children}
      {showBindingControls && (
        <div className={getClassName("toolbar")}>
          <BindingControl
            binding={binding}
            disabled={readOnly && !binding}
            field={field}
            onChange={async (nextBinding) => {
              const nextNodeState: NodeViewState = {
                templates: {
                  ...nodeState.templates,
                },
                bindings: {
                  ...nodeState.bindings,
                },
              };

              if (nextBinding) {
                nextNodeState.bindings[name] = nextBinding;
              } else {
                delete nextNodeState.bindings[name];
              }

              await replaceProps(
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
      )}
    </div>
  );
}
