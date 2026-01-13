import React from "react";
import type { Config, Field } from "@puckeditor/core";

export type StorybookArgs = Record<string, any>;

export type StorybookControl = { type?: string } | string | null | undefined;

export type StorybookArgType = {
  control?: StorybookControl | false;
  options?: readonly any[];
  name?: string;
  description?: string;
  type?: { name?: string } | string;
};

export type StorybookMeta = {
  title?: string;
  component?: React.ComponentType<any>;
  render?: (args: StorybookArgs) => React.ReactElement;
  args?: StorybookArgs;
  argTypes?: Record<string, StorybookArgType>;
};

export type StorybookStoryObject = {
  name?: string;
  storyName?: string;
  render?: (args: StorybookArgs) => React.ReactElement;
  args?: StorybookArgs;
  argTypes?: Record<string, StorybookArgType>;
};

export type StorybookStoryFn = ((args: StorybookArgs) => React.ReactElement) & {
  args?: StorybookArgs;
  argTypes?: Record<string, StorybookArgType>;
  storyName?: string;
};

export type StorybookStory = StorybookStoryObject | StorybookStoryFn;

export type StorybookModule = {
  default?: StorybookMeta;
  [key: string]: unknown;
};

export type StorybookToPuckOptions = {
  includeTitleInKey?: boolean;
  keyPrefix?: string;
  category?: string;
  includeCategories?: boolean;
  mapArgTypes?: boolean;
};

const RESERVED_EXPORTS = new Set(["default", "__esModule", "__namedExportsOrder"]);

export function storybookToPuckConfig(
  module: StorybookModule,
  options: StorybookToPuckOptions = {}
): Config {
  const meta = module.default ?? {};
  const title = meta.title ?? "Storybook";
  const includeTitleInKey = options.includeTitleInKey !== false;
  const includeCategories = options.includeCategories !== false;
  const mapArgTypes = options.mapArgTypes !== false;

  const entries = Object.entries(module).filter(([key, value]) => {
    if (RESERVED_EXPORTS.has(key)) return false;
    if (!value) return false;
    return typeof value === "function" || typeof value === "object";
  }) as Array<[string, StorybookStory]>;

  if (!meta.component && entries.length === 0 && !meta.render) {
    throw new Error(
      "storybook-to-puck: default export must include a component or render when no stories are exported"
    );
  }

  const components: Config["components"] = {};
  const componentKeys: string[] = [];

  const categoryName = options.category ?? title;

  const stories = entries.length
    ? entries
    : [["Default", { args: meta.args, render: meta.render } as StorybookStory]];

  for (const [exportName, story] of stories) {
    const componentKey = buildComponentKey(
      exportName,
      includeTitleInKey ? title : undefined,
      options.keyPrefix
    );

    const label = resolveStoryLabel(exportName, story);
    const storyArgs = getStoryArgs(story) ?? {};
    const defaultProps = {
      ...(meta.args ?? {}),
      ...storyArgs
    };

    const explicitArgTypes = mapArgTypes
      ? {
          ...(meta.argTypes ?? {}),
          ...(getStoryArgTypes(story) ?? {})
        }
      : undefined;

    const inferredArgTypes = mapArgTypes
      ? inferArgTypes(defaultProps)
      : undefined;

    const mergedArgTypes = mapArgTypes
      ? {
          ...(inferredArgTypes ?? {}),
          ...(explicitArgTypes ?? {})
        }
      : undefined;

    const fields = mergedArgTypes
      ? argTypesToFields(mergedArgTypes)
      : undefined;

    const render = createStoryRender(meta, story, componentKey);

    components[componentKey] = {
      label,
      render,
      defaultProps: Object.keys(defaultProps).length ? defaultProps : undefined,
      fields: fields && Object.keys(fields).length ? fields : undefined
    };

    componentKeys.push(componentKey);
  }

  const config: Config = {
    components
  };

  if (includeCategories) {
    config.categories = {
      [categoryName]: {
        title: categoryName,
        components: componentKeys
      }
    };
  }

  return config;
}

export function argTypesToFields(
  argTypes: Record<string, StorybookArgType>
): Record<string, Field> {
  const fields: Record<string, Field> = {};

  for (const [key, argType] of Object.entries(argTypes)) {
    if (!argType || argType.control === false) {
      continue;
    }

    const label = argType.name ?? humanizeLabel(key);
    const controlType = getControlType(argType.control);
    const options = argType.options ?? [];

    if (options.length > 0) {
      const type =
        controlType === "radio" || controlType === "inline-radio"
          ? "radio"
          : "select";

      fields[key] = {
        type,
        label,
        options: options.map((value) => ({
          label: String(value),
          value
        }))
      } as Field;

      continue;
    }

    const fallbackType = getTypeName(argType.type);

    if (controlType === "number" || fallbackType === "number") {
      fields[key] = {
        type: "number",
        label
      };
      continue;
    }

    if (controlType === "boolean" || fallbackType === "boolean") {
      fields[key] = {
        type: "radio",
        label,
        options: [
          { label: "True", value: true },
          { label: "False", value: false }
        ]
      };
      continue;
    }

    if (
      controlType === "color" ||
      controlType === "text" ||
      controlType === "file" ||
      fallbackType === "string"
    ) {
      fields[key] = {
        type: "text",
        label
      };
      continue;
    }
  }

  return fields;
}

function inferArgTypes(args: StorybookArgs): Record<string, StorybookArgType> {
  const inferred: Record<string, StorybookArgType> = {};

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) {
      continue;
    }

    const valueType = typeof value;

    if (valueType === "string") {
      inferred[key] = { control: looksLikeColor(value) ? "color" : "text" };
      continue;
    }

    if (valueType === "number") {
      inferred[key] = { control: "number" };
      continue;
    }

    if (valueType === "boolean") {
      inferred[key] = { control: "boolean" };
      continue;
    }
  }

  return inferred;
}

function buildComponentKey(
  exportName: string,
  title?: string,
  prefix?: string
) {
  const segments = [prefix, title, exportName]
    .filter(Boolean)
    .map((segment) => String(segment));

  return segments.join("/");
}

function resolveStoryLabel(exportName: string, story: StorybookStory) {
  const storyName =
    (isStoryObject(story) ? story.name : undefined) ??
    (story as StorybookStoryFn).storyName;

  return storyName ?? humanizeLabel(exportName);
}

function getStoryArgs(story: StorybookStory) {
  if (isStoryObject(story)) {
    return story.args;
  }

  return story.args;
}

function getStoryArgTypes(story: StorybookStory) {
  if (isStoryObject(story)) {
    return story.argTypes;
  }

  return story.argTypes;
}

function createStoryRender(
  meta: StorybookMeta,
  story: StorybookStory,
  componentKey: string
) {
  return (props: Record<string, any>) => {
    const { id, puck, editMode, ...rest } = props;

    if (typeof story === "function") {
      return story(rest);
    }

    if (story.render) {
      return story.render(rest);
    }

    if (meta.render) {
      return meta.render(rest);
    }

    if (meta.component) {
      return React.createElement(meta.component, rest);
    }

    throw new Error(
      `storybook-to-puck: Unable to resolve render function for "${componentKey}"`
    );
  };
}

function isStoryObject(story: StorybookStory): story is StorybookStoryObject {
  return typeof story === "object" && story !== null;
}

function getControlType(control?: StorybookControl | false) {
  if (!control) return undefined;
  if (typeof control === "string") return control;
  return control.type;
}

function getTypeName(type?: StorybookArgType["type"]) {
  if (!type) return undefined;
  if (typeof type === "string") return type;
  return type.name;
}

function looksLikeColor(value: string) {
  return (
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
    /^(rgb|rgba|hsl|hsla)\(/i.test(value)
  );
}

function humanizeLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
