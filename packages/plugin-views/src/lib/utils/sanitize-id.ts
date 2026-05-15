/**
 * Sanitizes a user-provided ID into a slug-like value.
 *
 * @param value The raw value to sanitize
 * @param options Controls whether underscores should be preserved
 * @returns The sanitized ID
 */
export const sanitizeId = (
  value: string,
  { preserveUnderscores = true }: { preserveUnderscores?: boolean } = {}
) => {
  const invalidCharacters = preserveUnderscores
    ? /[^a-z0-9_-]+/g
    : /[^a-z0-9]+/g;

  return value
    .trim()
    .toLowerCase()
    .replace(invalidCharacters, "-")
    .replace(/^-+|-+$/g, "");
};
