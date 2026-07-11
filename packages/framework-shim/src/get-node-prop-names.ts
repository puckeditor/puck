import type { Field, Fields } from "./core";

/**
 * Whether core's default field transforms swap this field's prop value for a
 * node (an element or a render function) rather than passing the plain value
 * through to the component's `render`:
 *
 *  - `slot` — always a render function (slot transform);
 *  - `richtext` — always an element, in both the editor and `<Render>`
 *    (`contentEditable: false` / read-only still yields `<RichTextRender>`);
 *  - `text` / `textarea` / `custom` with `contentEditable: true` — an
 *    `<InlineTextField>` element in the editor, the plain value in `<Render>`.
 *    (For `custom`, the transform only swaps string values at runtime; this
 *    predicate is static and treats the field as node-valued regardless.)
 *
 * This predicate decides which props ride the outlet/portal protocol instead
 * of being handed to the framework component as plain data. KEEP IN SYNC with
 * core's default transforms
 * (`packages/core/lib/field-transforms/default-transforms/`) — the
 * richtext/contentEditable smoke tests in both framework packages exercise
 * every branch end-to-end.
 */
export const isNodeValuedField = (field: Field): boolean => {
  if (!field || typeof field !== "object") return false;

  if (field.type === "slot" || field.type === "richtext") return true;

  return (
    (field.type === "text" ||
      field.type === "textarea" ||
      field.type === "custom") &&
    field.contentEditable === true
  );
};

/** The names of the fields whose prop values are node-valued (see above). */
export const getNodePropNames = (fields: Fields = {}): string[] =>
  Object.keys(fields).filter((name) =>
    isNodeValuedField((fields as Record<string, Field>)[name])
  );
