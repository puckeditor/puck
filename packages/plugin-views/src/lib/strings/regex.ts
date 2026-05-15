/**
 * Escapes all special regex characters in a string.
 *
 * @param value The string to escape
 * @returns The escaped string, safe for use in `new RegExp`
 */
export const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
