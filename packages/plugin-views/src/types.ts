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

export type ViewValueOption = {
  viewId: string;
  path: string;
  expression: string;
  preview: string;
  valueType: ValueType;
};

export type ViewsPluginOptions = {
  sources: ViewSources;
  builtInViews?: BuiltInView[];
  storageKey?: string;
  nodeStateKey?: string;
};
