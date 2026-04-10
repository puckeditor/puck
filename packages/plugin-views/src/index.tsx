"use client";

import type { Field, Plugin } from "@puckeditor/core";
import { Database } from "lucide-react";
import { FieldEnhancer } from "./components/FieldEnhancer";
import { TemplateField } from "./components/TemplateField";
import { ViewsPluginPanel } from "./components/ViewsPluginPanel";
import {
  RENDER_DATA_BINDING_KEY,
  DEFAULT_NODE_STATE_KEY,
  DEFAULT_STORAGE_KEY,
} from "./lib/views";
import type { ViewsPluginOptions } from "./types";

const shouldShowDataBindings = (field: any) =>
  Boolean(field?.metadata?.[RENDER_DATA_BINDING_KEY]);

export function createViewsPlugin(options: ViewsPluginOptions): Plugin {
  const normalizedOptions: ViewsPluginOptions = {
    ...options,
    nodeStateKey: options.nodeStateKey ?? DEFAULT_NODE_STATE_KEY,
    storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
  };

  return {
    name: "views",
    label: "Views",
    icon: <Database size={18} />,
    mobilePanelHeight: "min-content",
    render: () => <ViewsPluginPanel options={normalizedOptions} />,
    overrides: {
      fieldTypes: {
        text: ({ children, field, name, readOnly, value }) =>
          shouldShowDataBindings(field) ? (
            <TemplateField
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
              value={value}
            />
          ) : (
            <>{children}</>
          ),
        textarea: ({ children, field, name, readOnly, value }) =>
          shouldShowDataBindings(field) ? (
            <TemplateField
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
              value={value}
            />
          ) : (
            <>{children}</>
          ),
        number: ({ children, field, name, readOnly }) =>
          shouldShowDataBindings(field) ? (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ) : (
            <>{children}</>
          ),
        select: ({ children, field, name, readOnly }) =>
          shouldShowDataBindings(field) ? (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ) : (
            <>{children}</>
          ),
        radio: ({ children, field, name, readOnly }) =>
          shouldShowDataBindings(field) ? (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ) : (
            <>{children}</>
          ),
        array: ({ children, field, name, readOnly }) =>
          shouldShowDataBindings(field) ? (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ) : (
            <>{children}</>
          ),
      },
    },
  };
}
