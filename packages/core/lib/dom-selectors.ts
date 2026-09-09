/**
 * Sanitizes a string to be used as a CSS selector by escaping special characters.
 * @param value The string to be sanitized.
 * @returns The sanitized string that can be safely used as a CSS selector.
 */
const escapeId = (value: string) =>
  typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value;

/**
 * Gets a CSS selector for a component based on its ID.
 * @param id The ID of the component.
 * @returns The CSS selector for the component.
 */
export const getComponentSelector = (id: string) =>
  `[data-puck-component="${escapeId(id)}"]`;

/**
 * Gets a CSS selector for a drop zone based on its zone compound.
 * @param zone The zone compound (e.g. "MySlot-123:body").
 * @returns The CSS selector for the drop zone.
 */
export const getZoneSelector = (zone: string) =>
  `[data-puck-dropzone="${escapeId(zone)}"]`;
