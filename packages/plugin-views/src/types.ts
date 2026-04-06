import type { Fields } from "@puckeditor/core";

export type ViewFieldConnection = {
  propertyId: string;
  index: number;
  propertyName: string;
};

export type ViewSource = {
  fields: Fields;
  fetch: (params: any) => Promise<any>;
};

export type ViewSources = Record<string, ViewSource>;

export type ViewFieldValue = {
  source?: string;
  params?: Record<string, any>;
  fields?: Record<string, ViewFieldConnection>;
  arrays?: Record<string, boolean>;
};

export type ReferenceOption = {
  label: string;
  value: string;
};
