"use client";

import type { Plugin } from "@puckeditor/core";
import { createArrayFieldType } from "./field-types/ArrayFieldType";
import { createTextFieldType } from "./field-types/TextFieldType";
import { createViewFieldType } from "./field-types/ViewFieldType";
import type { ReferenceOption, ViewSources } from "./types";

export function createViewsPlugin({
  references,
  sources = {},
}: {
  references?: ReferenceOption[];
  sources?: ViewSources;
} = {}) {
  return {
    overrides: {
      fieldTypes: {
        text: createTextFieldType({ sources }),
        array: createArrayFieldType({ sources }),
        view: createViewFieldType({ references, sources }),
      },
    },
  } satisfies Plugin;
}
