import type { ViewFieldConnection } from "../types";

type ArrayContext = { arrayPath: string; index: number };

const getArrayContexts = (path: string): ArrayContext[] => {
  const segments = path.split(".");
  const contexts: ArrayContext[] = [];
  const built: string[] = [];

  segments.forEach((segment) => {
    const match = /^([^[\]]+)\[(\d+)\]$/.exec(segment);

    if (match) {
      const [, base, index] = match;
      const arrayPath = [...built, base].join(".");

      contexts.push({
        arrayPath,
        index: Number(index),
      });

      built.push(`${base}[${index}]`);
    } else {
      built.push(segment);
    }
  });

  return contexts;
};

export const getConnectedArrayContext = ({
  path,
  arrays,
}: {
  path: string;
  arrays: Record<string, boolean>;
}) => {
  const contexts = getArrayContexts(path).filter(
    ({ arrayPath }) => arrays[arrayPath]
  );

  return contexts.length > 0 ? contexts[contexts.length - 1] : null;
};

export const getValueAtPath = (obj: any, path: string) => {
  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  const parts = normalized.split(".").filter(Boolean);

  return parts.reduce((acc, part) => {
    if (acc === null || typeof acc === "undefined") return undefined;
    return acc[part];
  }, obj);
};

export const getArrayItemFieldPathParts = ({
  path,
  arrayPath,
  index,
}: {
  path: string;
  arrayPath: string;
  index: number;
}) => {
  const prefix = `${arrayPath}[${index}].`;

  if (!path.startsWith(prefix)) return null;

  return {
    prefix,
    relativePath: path.slice(prefix.length),
  };
};

export const buildArrayItemsToLength = ({
  currentArray,
  nextLength,
  defaultItemProps,
}: {
  currentArray: any[];
  nextLength: number;
  defaultItemProps: any;
}) => {
  const nextArray = currentArray.slice(0, nextLength);

  for (let idx = nextArray.length; idx < nextLength; idx++) {
    if (typeof defaultItemProps === "function") {
      nextArray.push(defaultItemProps(idx));
    } else if (defaultItemProps && typeof defaultItemProps === "object") {
      nextArray.push({ ...defaultItemProps });
    } else {
      nextArray.push({});
    }
  }

  return nextArray;
};

export const syncArrayConnectionsToLength = ({
  connections,
  arrayPath,
  nextLength,
}: {
  connections: Record<string, ViewFieldConnection>;
  arrayPath: string;
  nextLength: number;
}) => {
  const nextConnections = { ...connections };
  let changed = false;
  const templatesByRelativePath: Record<string, string> = {};

  const arrayPathRegex = new RegExp(
    `^${arrayPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[(\\d+)\\]\\.(.+)$`
  );

  Object.entries(nextConnections).forEach(([fieldPath, connection]) => {
    const match = arrayPathRegex.exec(fieldPath);
    const arrayIndex = match ? Number(match[1]) : null;
    const relativePath = match ? match[2] : null;

    if (arrayIndex === null) return;

    if (arrayIndex >= nextLength) {
      delete nextConnections[fieldPath];
      changed = true;
      return;
    }

    if (relativePath) {
      templatesByRelativePath[relativePath] = connection.propertyName;
    }

    const nextPropertyId = `[${arrayIndex}].${connection.propertyName}`;

    if (
      connection.index !== arrayIndex ||
      connection.propertyId !== nextPropertyId
    ) {
      nextConnections[fieldPath] = {
        ...connection,
        index: arrayIndex,
        propertyId: nextPropertyId,
      };
      changed = true;
    }
  });

  Object.entries(templatesByRelativePath).forEach(
    ([relativePath, propertyName]) => {
      for (let idx = 0; idx < nextLength; idx++) {
        const fieldPath = `${arrayPath}[${idx}].${relativePath}`;

        if (!nextConnections[fieldPath]) {
          nextConnections[fieldPath] = {
            propertyId: `[${idx}].${propertyName}`,
            index: idx,
            propertyName,
          };
          changed = true;
        }
      }
    }
  );

  return { nextConnections, changed };
};
