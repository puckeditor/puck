import { createContext, PropsWithChildren, useContext, useMemo } from "react";

type NestedFieldContext = {
  localName?: string;
  readOnlyFields?: Partial<Record<string | number | symbol, boolean>>;
  value?: any;
};

export const NestedFieldContext = createContext<NestedFieldContext>({});

export const useNestedFieldContext = () => {
  const context = useContext(NestedFieldContext);

  return {
    ...context,
    readOnlyFields: context.readOnlyFields || {},
  };
};

export const NestedFieldProvider = ({
  children,
  name,
  subName,
  wildcardName = name,
  readOnlyFields,
}: PropsWithChildren<{
  name: string;
  subName: string;
  wildcardName?: string;
  readOnlyFields: Partial<Record<string | number | symbol, boolean>>;
}>) => {
  const subPath = `${name}.${subName}`;
  const wildcardSubPath = `${wildcardName}.${subName}`;

  const subReadOnlyFields = useMemo(
    () =>
      Object.keys(readOnlyFields).reduce((acc, readOnlyKey) => {
        const isLocal =
          readOnlyKey.indexOf(subPath) > -1 ||
          readOnlyKey.indexOf(wildcardSubPath) > -1;

        if (isLocal) {
          const subPathPattern = new RegExp(
            `^(${name}|${wildcardName})\.`
              .replace(/\[/g, "\\[")
              .replace(/\]/g, "\\]")
              .replace(/\./g, "\\.")
              .replace(/\*/g, "\\*")
          );

          const localName = readOnlyKey.replace(subPathPattern, "");

          return {
            ...acc,
            [localName]: readOnlyFields[readOnlyKey],
          };
        }

        return acc;
      }, {}),
    [name, subName, wildcardName, readOnlyFields]
  );

  return (
    <NestedFieldContext.Provider
      value={{ readOnlyFields: subReadOnlyFields, localName: subName }}
    >
      {children}
    </NestedFieldContext.Provider>
  );
};
