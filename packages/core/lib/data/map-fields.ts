import {
  ComponentData,
  Config,
  Content,
  Field,
  Fields,
  RootData,
} from "../../types";
import { defaultSlots } from "./default-slots";

export type MapFnParams<ThisField = Field> = {
  value: any;
  parentId: string;
  propName: string;
  field: ThisField;
  propPath: string;
};

type MapFn<T = any> = (params: MapFnParams) => T;

export type Mappers<T = EitherMapFn> = Partial<Record<Field["type"], T>>;

type PromiseMapFn = MapFn<Promise<any>>;

type EitherMapFn = MapFn<any | Promise<any>>;

type WalkFieldOpts = {
  value: unknown;
  fields: Fields;
  mappers: Mappers;
  propKey?: string;
  propPath?: string;
  id?: string;
  config: Config;
  recurseSlots?: boolean;
};

type WalkObjectOpts = {
  value: Record<string, any>;
  fields: Fields;
  mappers: Mappers;
  id: string;
  getPropPath: (str: string) => string;
  config: Config;
  recurseSlots?: boolean;
  ownedFields?: boolean;
};

const isPromise = <T = unknown>(v: any): v is Promise<T> =>
  !!v && typeof v.then === "function";

const flatten = (values: Record<string, any>[]) =>
  values.reduce((acc, item) => ({ ...acc, ...item }), {});

const containsPromise = (arr: any[]) => arr.some(isPromise);

export const walkField = ({
  value,
  fields,
  mappers,
  propKey = "",
  propPath = "",
  id = "",
  config,
  recurseSlots = false,
}: WalkFieldOpts): any | Promise<any> => {
  const fieldType = fields[propKey]?.type;
  const map = mappers[fieldType];

  if (map && fieldType === "slot") {
    const content = (value as Content) || [];

    const mappedContent = recurseSlots
      ? content.map((el) => {
          if (!config.components[el.type]) {
            throw new Error(`Could not find component config for ${el.type}`);
          }

          return mapFields(el, mappers, config, recurseSlots);
        })
      : content;

    if (containsPromise(mappedContent)) {
      return Promise.all(mappedContent);
    }

    return map({
      value: mappedContent,
      parentId: id,
      propName: propPath,
      field: fields[propKey],
      propPath,
    });
  } else if (map && fields[propKey]) {
    return map({
      value,
      parentId: id,
      propName: propKey,
      field: fields[propKey],
      propPath,
    });
  }

  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      const arrayFields =
        fields[propKey]?.type === "array" ? fields[propKey].arrayFields : null;

      if (!arrayFields) return value;

      const newValue = value.map((el, idx) =>
        walkField({
          value: el,
          fields: arrayFields,
          mappers,
          propKey,
          propPath: `${propPath}[${idx}]`,
          id,
          config,
          recurseSlots,
        })
      );

      if (containsPromise(newValue)) {
        return Promise.all(newValue);
      }

      return newValue;
    } else if ("$$typeof" in value) {
      return value;
    } else {
      const objectFields =
        fields[propKey]?.type === "object"
          ? fields[propKey].objectFields
          : fields;

      return walkObject({
        value,
        fields: objectFields,
        mappers,
        id,
        getPropPath: (k) => `${propPath}.${k}`,
        config,
        recurseSlots,
        // Only default missing fields when objectFields describe this value
        ownedFields: fields[propKey]?.type === "object",
      });
    }
  }

  return value;
};

const walkObject = ({
  value,
  fields,
  mappers,
  id,
  getPropPath,
  config,
  recurseSlots,
  ownedFields,
}: WalkObjectOpts): Record<string, any> => {
  const keys = Object.keys(value);

  // Include fields that have a mapper but no value, so their transforms still
  // run (e.g. a contentEditable text field without a default prop). Slots are
  // defaulted separately via defaultSlots.
  if (ownedFields) {
    for (const fieldName in fields) {
      const fieldType = fields[fieldName].type;

      if (fieldType !== "slot" && mappers[fieldType] && !(fieldName in value)) {
        keys.push(fieldName);
      }
    }
  }

  const newProps = keys.map((k) => {
    const opts: WalkFieldOpts = {
      value: value[k],
      fields,
      mappers,
      propKey: k,
      propPath: getPropPath(k),
      id,
      config,
      recurseSlots,
    };

    const newValue = walkField(opts);

    if (isPromise(newValue)) {
      return newValue.then((resolvedValue: any) => ({
        [k]: resolvedValue,
      }));
    }

    return {
      [k]: newValue,
    };
  }, {});

  if (containsPromise(newProps)) {
    return Promise.all(newProps).then(flatten);
  }

  return flatten(newProps);
};

export function mapFields<T extends ComponentData | RootData>(
  item: T,
  mappers: Mappers<MapFn>,
  config: Config,
  recurseSlots?: boolean,
  shouldDefaultSlots?: boolean
): T;

export function mapFields<T extends ComponentData | RootData>(
  item: T,
  mappers: Mappers<PromiseMapFn>,
  config: Config,
  recurseSlots?: boolean,
  shouldDefaultSlots?: boolean
): Promise<T>;

export function mapFields(
  item: any,
  mappers: Mappers,
  config: Config,
  recurseSlots: boolean = false,
  shouldDefaultSlots: boolean = true
): any {
  const itemType = "type" in item ? item.type : "root";

  const componentConfig =
    itemType === "root" ? config.root : config.components?.[itemType];

  const newProps = walkObject({
    value: shouldDefaultSlots
      ? defaultSlots(item.props ?? {}, componentConfig?.fields ?? {})
      : item.props,
    fields: componentConfig?.fields ?? {},
    mappers,
    id: item.props ? item.props.id ?? "root" : "root",
    getPropPath: (k) => k,
    config,
    recurseSlots,
    ownedFields: true,
  });

  if (isPromise(newProps)) {
    return newProps.then((resolvedProps) => ({
      ...item,
      props: resolvedProps,
    }));
  }

  return {
    ...item,
    props: newProps,
  };
}
