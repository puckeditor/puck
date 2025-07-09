import {
  ComponentData,
  Config,
  Content,
  Fields,
  RootData,
  SlotField,
} from "../../types";
import { defaultSlots } from "./default-slots";

type MapFn<T = any> = (
  data: Content,
  parentId: string,
  propName: string,
  field: SlotField,
  propPath: string
) => T;

type PromiseMapFn = MapFn<Promise<any>>;

type EitherMapFn = MapFn<any | Promise<any>>;

type WalkFieldOpts = {
  value: unknown;
  fields: Fields;
  map: EitherMapFn;
  propKey?: string;
  propPath?: string;
  id?: string;
  config: Config;
  recurseSlots?: boolean;
};

type WalkObjectOpts = {
  value: Record<string, any>;
  fields: Fields;
  map: EitherMapFn;
  id: string;
  getPropPath: (str: string) => string;
  config: Config;
  recurseSlots?: boolean;
};

const isPromise = <T = unknown>(v: any): v is Promise<T> =>
  !!v && typeof v.then === "function";

const flatten = (values: Record<string, any>[]) =>
  values.reduce((acc, item) => ({ ...acc, ...item }), {});

const containsPromise = (arr: any[]) => arr.some(isPromise);

export const walkField = ({
  value,
  fields,
  map,
  propKey = "",
  propPath = "",
  id = "",
  config,
  recurseSlots = false,
}: WalkFieldOpts): any | Promise<any> => {
  if (fields[propKey]?.type === "slot") {
    const content = (value as Content) || [];

    const mappedContent = recurseSlots
      ? content.map((el) => {
          const componentConfig = config.components[el.type];

          if (!componentConfig) {
            throw new Error(`Could not find component config for ${el.type}`);
          }

          const fields = componentConfig.fields ?? {};

          return walkField({
            value: { ...el, props: defaultSlots(el.props, fields) },
            fields,
            map,
            id: el.props.id,
            config,
            recurseSlots,
          });
        })
      : content;

    if (containsPromise(mappedContent)) {
      return Promise.all(mappedContent);
    }

    return map(mappedContent, id, propPath, fields[propKey], propPath);
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
          map,
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
        map,
        id,
        getPropPath: (k) => `${propPath}.${k}`,
        config,
        recurseSlots,
      });
    }
  }

  return value;
};

const walkObject = ({
  value,
  fields,
  map,
  id,
  getPropPath,
  config,
  recurseSlots,
}: WalkObjectOpts): Record<string, any> => {
  const newProps = Object.entries(value).map(([k, v]) => {
    const opts: WalkFieldOpts = {
      value: v,
      fields,
      map,
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

export function mapSlots<T extends ComponentData | RootData>(
  item: T,
  map: MapFn,
  config: Config,
  recurseSlots?: boolean
): T;

export function mapSlots<T extends ComponentData | RootData>(
  item: T,
  map: PromiseMapFn,
  config: Config,
  recurseSlots?: boolean
): Promise<T>;

export function mapSlots(
  item: any,
  map: EitherMapFn,
  config: Config,
  recurseSlots: boolean = false
): any {
  const itemType = "type" in item ? item.type : "root";

  const componentConfig =
    itemType === "root" ? config.root : config.components?.[itemType];

  const newProps = walkObject({
    value: defaultSlots(item.props ?? {}, componentConfig?.fields ?? {}),
    fields: componentConfig?.fields ?? {},
    map,
    id: item.props ? item.props.id ?? "root" : "root",
    getPropPath: (k) => k,
    config,
    recurseSlots,
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
