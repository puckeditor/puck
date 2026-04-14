import { sanitizeId } from "../../sanitize-id";

/**
 * Creates a unique custom view ID from a label or source.
 *
 * @param options The existing IDs and source values to derive from
 * @returns A unique view ID
 */
export const createViewId = ({
  existingIds,
  label,
  source,
}: {
  existingIds: string[];
  label?: string;
  source?: string;
}) => {
  const base =
    sanitizeId(label || source || "", {
      preserveUnderscores: false,
    }) || "view";

  if (!existingIds.includes(base)) {
    return base;
  }

  let counter = 2;

  while (existingIds.includes(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
};
