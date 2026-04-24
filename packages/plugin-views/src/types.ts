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

/**
 * Represents how a synced field gets its shared value.
 *
 * Manual sync stores the last shared value so the resolver can keep array items aligned (Puck's lastData isn't reliable for this).
 * Derived sync means a binding or wildcard template already owns the synced value.
 */
export type NodeViewSync =
  | { type: "derived" }
  | { type: "manual"; value: unknown };

export type NodeViewState = {
  /** Static or wildcard field paths that are using templates. The value is the template text as shown in the fields. */
  templates: Record<string, string>;
  /** Static or wildcard field paths that are currently bound to a view value. The value is the binding information. */
  bindings: Record<string, NodeViewBinding>;
  /** Wildcard field paths that should share one value across all matched array items. The value is the sync information. */
  synced: Record<string, NodeViewSync>;
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
