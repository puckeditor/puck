/**
 * The lucide "lock" icon core's `FieldLabel` renders for read-only fields
 * (`<Lock size="12" />`), as an SVG string for the framework packages' native
 * FieldLabel implementations. Keep in sync with core's
 * `components/AutoField/FieldLabel.tsx` (the icon itself changes rarely; the
 * class-name contract comes from core via `fieldLabelClasses`).
 */
export const fieldLabelLockIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
