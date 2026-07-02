/**
 * Default messages for every hard-coded string shown in the Puck editor UI.
 *
 * Tokens follow a `{area}-{name}-{variant}` structure, where hyphens only
 * separate segments (compound words within a segment are concatenated, e.g.
 * `field-arrayitem-summary`). The `action` and `label` areas are virtual:
 * their strings are shared by every surface that renders them.
 */
export const defaultDictionary = {
  // Header
  "header-publish": "Publish",
  "header-undo": "undo",
  "header-redo": "redo",
  "header-toggle-leftsidebar": "Toggle left sidebar",
  "header-toggle-rightsidebar": "Toggle right sidebar",
  "header-toggle-menubar": "Toggle menu bar",
  // Component action bar
  "action-selectparent": "Select parent",
  "action-duplicate": "Duplicate",
  "action-delete": "Delete",
  // Fallback labels — shared by the breadcrumbs, fields panel and header
  "label-page": "Page",
  "label-component": "Component",
  // Outline
  "outline-empty": "No items",
  "outline-collapse": "Collapse",
  "outline-expand": "Expand",
  // Drawer (component list)
  "drawer-category-collapse": "Collapse {title}",
  "drawer-category-expand": "Expand {title}",
  "drawer-category-other": "Other",
  // Fields
  "field-readonly": "Read-only",
  "field-arrayitem-summary": "Item #{index}",
  "field-arrayitem-duplicate": "Duplicate",
  "field-arrayitem-delete": "Delete",
  "field-external-selectdata": "Select data",
  "field-external-search": "Search",
  "field-external-togglefilters": "Toggle filters",
  "field-external-item": "External item",
  "field-external-result-singular": "{count} result",
  "field-external-result-plural": "{count} results",
  // Rich text field
  "field-richtext-bold": "Bold",
  "field-richtext-italic": "Italic",
  "field-richtext-underline": "Underline",
  "field-richtext-strikethrough": "Strikethrough",
  "field-richtext-blockquote": "Blockquote",
  "field-richtext-code-inline": "Inline code",
  "field-richtext-code-block": "Code block",
  "field-richtext-list-bullet": "Bullet list",
  "field-richtext-list-ordered": "Ordered list",
  "field-richtext-horizontalrule": "Horizontal rule",
  "field-richtext-align-left": "Align left",
  "field-richtext-align-center": "Align center",
  "field-richtext-align-right": "Align right",
  "field-richtext-align-justify": "Justify",
  "field-richtext-select": "Select",
  // Viewport controls
  "viewport-zoom-in": "Zoom viewport in",
  "viewport-zoom-out": "Zoom viewport out",
  "viewport-toggle-menu": "Toggle viewport menu",
  "viewport-switch": "Switch to {label} viewport",
  "viewport-switch-default": "Switch viewport",
  // Plugin bar
  "plugin-blocks": "Blocks",
  "plugin-outline": "Outline",
  "plugin-fields": "Fields",
  "plugin-components": "Components",
  // Layout
  "layout-maximize": "maximize",
  "layout-minimize": "minimize",
  // Loader
  "loader-loading": "loading",
} as const;

export type DictionaryKey = keyof typeof defaultDictionary;

/**
 * Override any of Puck's built-in UI strings. Provide only the keys you want to
 * change; omitted keys fall back to their default.
 *
 * Fallback uses `??`, so an explicit empty string `""` is honored (renders
 * nothing) — only `undefined`/`null` falls back to the default.
 */
export type Dictionary = Partial<Record<DictionaryKey, string>>;

/**
 * Replace `{placeholder}` tokens in a template.
 *
 * A token whose param is missing is left as-is (e.g. `{label}` stays visible)
 * rather than being silently replaced with an empty string — so a wrong
 * dictionary or a forgotten param surfaces in the UI instead of disappearing.
 */
const interpolate = (
  template: string,
  params: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] !== undefined ? String(params[key]) : match
  );

/**
 * Resolve a message: the dictionary override if present, otherwise the built-in
 * default, with optional `{placeholder}` interpolation.
 *
 * This is the single place message resolution happens. Components use `useMessage`
 * to read messages reactively.
 */
export const getMessage = (
  dictionary: Dictionary,
  key: DictionaryKey,
  params?: Record<string, string | number>
): string => {
  const message = dictionary[key] ?? defaultDictionary[key];

  return params ? interpolate(message, params) : message;
};
