import type { ComponentData, Fields, Metadata } from "@puckeditor/core";

export type ViewFetchContext = {
  metadata?: Metadata;
  root: ComponentData | null;
  viewId?: string;
};

export type ViewSource = {
  fields: Fields;
  fetch: (
    params: Record<string, any>,
    context?: ViewFetchContext
  ) => Promise<any>;
};

export type ViewSources = Record<string, ViewSource>;

export type BuiltInView = {
  id: string;
  label: string;
  source: string;
  params?: Record<string, any>;
};

export type CustomView = {
  id: string;
  label: string;
  source: string;
  params: Record<string, any>;
};

export type ViewsStorage = {
  custom: CustomView[];
};

export type ResolvedView = CustomView & {
  builtIn?: boolean;
};

export type NodeViewBinding = {
  viewId: string;
  path: string;
};

export type NodeViewState = {
  templates: Record<string, string>;
  bindings: Record<string, NodeViewBinding>;
};

export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "null"
  | "unknown";

/**
 * Represents a single value within a view that can be bound to a field.
 * This is used for displaying view options in the UI and creating bindings from them.
 */
export type ViewValueOption<Type = any> = {
  /** The ID of the view this option belongs to. Used for binding creation. */
  viewId: string;
  /** The path to the value within the view result. Used for binding creation. */
  path: string;
  /** The path expression. */
  expression: string;
  /** The value preview as a string. */
  preview: string;
  /** The value type. */
  valueType: ValueType;
  /** The option value. */
  value: Type;
};

export type ViewsPluginOptions = {
  sources: ViewSources;
  builtInViews?: BuiltInView[];
  storageKey?: string;
  nodeStateKey?: string;
};
