/**
 * Marks a Preact component produced by a shim bridge (`createComponentBridge` /
 * `createFieldBridge`). The config walker uses this to avoid double-wrapping:
 * core hands *transformed* fields back to `resolveFields` resolvers, so a
 * resolver that returns them unchanged must not have its already-bridged
 * renders wrapped again.
 */
const BRIDGED = Symbol("puck-framework-bridged");

export const markBridged = <T>(component: T): T => {
  (component as any)[BRIDGED] = true;
  return component;
};

export const isBridged = (component: unknown): boolean =>
  typeof component === "function" && (component as any)[BRIDGED] === true;
