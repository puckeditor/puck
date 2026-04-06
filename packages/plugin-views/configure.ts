import { ComponentConfig, Field } from "@puckeditor/core";
import { queryView } from "./src/lib/query-view";
import type { ViewSources } from "./src/types";

export type ViewFieldConnection = {
  propertyId: string;
  index: number;
  propertyName: string;
};

const getViewConnectionForPath = ({
  path,
  connections,
}: {
  path: string;
  connections: Record<string, ViewFieldConnection>;
}) => {
  const dotIndexedPath = path.replace(/\[(\d+)\]/g, ".$1");
  const wildcardPath = path.replace(/\[\d+\]/g, "[*]");
  const wildcardDotIndexedPath = dotIndexedPath.replace(/\.\d+/g, ".*");

  return (
    connections[path] ||
    connections[dotIndexedPath] ||
    connections[wildcardPath] ||
    connections[wildcardDotIndexedPath]
  );
};

const resolveViewProps = ({
  fields,
  props,
  viewData,
  viewFieldConnections,
  parentPath = "",
}: {
  fields: Record<string, Field>;
  props: Record<string, any>;
  viewData: any[];
  viewFieldConnections: Record<string, ViewFieldConnection>;
  parentPath?: string;
}) => {
  const newProps = { ...props };

  for (const fieldName in fields) {
    const field = fields[fieldName] as Field;
    const value = props[fieldName];
    const currentPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
    const connection =
      getViewConnectionForPath({
        path: currentPath,
        connections: viewFieldConnections,
      }) || (!parentPath ? viewFieldConnections[fieldName] : undefined);

    if (field.type === "text" && connection) {
      newProps[fieldName] =
        viewData[connection.index]?.[connection.propertyName];
      continue;
    }

    if (
      field.type === "object" &&
      field.objectFields &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      newProps[fieldName] = resolveViewProps({
        fields: field.objectFields as Record<string, Field>,
        props: value,
        viewData,
        viewFieldConnections,
        parentPath: currentPath,
      });
      continue;
    }

    if (field.type === "array" && field.arrayFields && Array.isArray(value)) {
      newProps[fieldName] = value.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return item;
        }

        return resolveViewProps({
          fields: field.arrayFields as Record<string, Field>,
          props: item,
          viewData,
          viewFieldConnections,
          parentPath: `${currentPath}[${index}]`,
        });
      });
    }
  }

  return newProps;
};

const resolveViewFieldProps = async ({
  props,
  fields,
  metadata,
  sources,
}: {
  props: Record<string, any>;
  fields: Record<string, Field>;
  metadata?: Record<string, any>;
  sources: ViewSources;
}) => {
  if (!props.view?.source) return props;

  const params = Object.keys(props.view.params).reduce((acc, paramKey) => {
    const param = props.view.params[paramKey];

    if (param.reference && metadata?.references) {
      const referenced = metadata?.references[param.reference];

      if (!referenced) {
        throw new Error("Data referenced from view was not provided");
      }

      return {
        ...acc,
        [paramKey]: referenced,
      };
    }

    return { ...acc, [paramKey]: param };
  }, {});

  const viewData = await queryView({
    source: props.view.source,
    params,
    sources,
  });

  return resolveViewProps({
    fields,
    props,
    viewData,
    viewFieldConnections:
      ((props.view as any).fields as
        | Record<string, ViewFieldConnection>
        | undefined) ?? {},
  });
};

export const resolvePropsFromView = async ({
  data,
  opts,
  fields,
  sources = {},
}: {
  data: { props: Record<string, any> } & Record<string, any>;
  opts: {
    changed?: Record<string, any>;
    trigger?: string;
    metadata?: Record<string, any>;
  };
  fields?: Record<string, Field>;
  sources?: ViewSources;
}) => {
  if (!fields) return data;
  if (!data.props.view?.source) return data;
  if (!opts.changed?.["view"] && opts.trigger !== "force") return data;

  const newProps = await resolveViewFieldProps({
    props: data.props,
    fields,
    metadata: opts.metadata,
    sources,
  });

  return {
    ...data,
    props: newProps,
  };
};

export const withView = <T extends ComponentConfig<any>>(
  config: T,
  sources?: ViewSources
): T => {
  const existingViewField = ((config.fields as any)?.view ?? {
    type: "view",
  }) as any;
  const viewField = {
    ...existingViewField,
    sources: sources ?? existingViewField.sources,
  };
  const fields = {
    view: viewField,
    ...(config.fields ?? {}),
  } as Record<string, Field>;
  const existingResolveData = config.resolveData;

  return {
    ...config,
    fields: fields as any,
    resolveData: async (data: any, opts: any) => {
      const baseData = existingResolveData
        ? await existingResolveData(data, opts)
        : data;

      return resolvePropsFromView({
        data: baseData,
        opts,
        fields,
        sources: ((fields.view as any)?.sources as ViewSources | undefined) ?? {},
      });
    },
  };
};
