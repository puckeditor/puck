"use client";

import type { Field, Plugin } from "@puckeditor/core";
import { Database } from "lucide-react";
import { FieldEnhancer } from "./components/FieldEnhancer";
import { TemplateField } from "./components/TemplateField";
import { ViewsPluginPanel } from "./components/ViewsPluginPanel";
import {
  DEFAULT_NODE_STATE_KEY,
  DEFAULT_STORAGE_KEY,
  INTERNAL_METADATA_KEY,
} from "./lib/views";
import type { ViewsPluginOptions } from "./types";

const shouldBypassFieldType = (field: any) =>
  Boolean(field?.metadata?.[INTERNAL_METADATA_KEY]);

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
          shouldBypassFieldType(field) ? (
            <>{children}</>
          ) : (
            <TemplateField
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
              value={value}
            />
          ),
        textarea: ({ children, field, name, readOnly, value }) =>
          shouldBypassFieldType(field) ? (
            <>{children}</>
          ) : (
            <TemplateField
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
              value={value}
            />
          ),
        number: ({ children, field, name, readOnly }) =>
          shouldBypassFieldType(field) ? (
            <>{children}</>
          ) : (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ),
        select: ({ children, field, name, readOnly }) =>
          shouldBypassFieldType(field) ? (
            <>{children}</>
          ) : (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ),
        radio: ({ children, field, name, readOnly }) =>
          shouldBypassFieldType(field) ? (
            <>{children}</>
          ) : (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ),
        array: ({ children, field, name, readOnly }) =>
          shouldBypassFieldType(field) ? (
            <>{children}</>
          ) : (
            <FieldEnhancer
              field={field as Field}
              name={name}
              options={normalizedOptions}
              readOnly={readOnly}
            >
              {children}
            </FieldEnhancer>
          ),
      },
    },
  };
}
