/**
 * Public surface of the private framework shim, consumed as source by each
 * framework package (@puckeditor/vue, @puckeditor/svelte, …). A framework
 * package supplies a `FrameworkAdapter` + thin `<Puck>`/`<Render>` shells and
 * wires them to these factories.
 */

// Bridges + config walker.
export { createComponentBridge } from "./create-component-bridge";
export type { CreateComponentBridgeOptions } from "./create-component-bridge";
export { createFieldBridge } from "./create-field-bridge";
export { createTransformConfig } from "./create-transform-config";
export type { CreateTransformConfigDeps } from "./create-transform-config";
export { createFrameworkApi } from "./create-framework-api";
export { markBridged, isBridged } from "./bridge-marker";

// Framework-facing config types (aliased per framework).
export type {
  FrameworkConfig,
  FrameworkComponentConfig,
  FrameworkRootConfig,
  FrameworkField,
  FrameworkFields,
  FrameworkCustomField,
} from "./framework-config";

// Editor / render host controllers.
export { createEditorHost, createRenderHost } from "./host";
export type {
  EditorProps,
  EditorHostDeps,
  RenderProps,
  RenderHostDeps,
} from "./host";

// Reactive prop reconciliation (adapters use this in their patch()).
export { patchProps } from "./patch-props";

// Outlet registry protocol (adapters mint outlets / register elements here).
export {
  nextUid,
  mapDropZoneProps,
  RENDER_DROPZONE_KEY,
  CHILDREN_KEY,
} from "./registry";
export type { SlotMount, SlotRegistry } from "./registry";

// Types for authoring adapters.
export type {
  FrameworkAdapter,
  MountedInstance,
  ComponentMountArgs,
  FieldMountArgs,
  DecorateComponentCtx,
  DecorateFieldCtx,
} from "./adapter";
export { DEFAULT_PUCK_CONTEXT } from "./split-props";
export type { Split, PuckContext } from "./split-props";

// FieldLabel contract for the framework packages' native implementations:
// class names from core (markup/CSS parity), lock icon owned by the shim.
export { fieldLabelClasses } from "./core";
export { fieldLabelLockIconSvg } from "./field-label-icon";
export { getNodePropNames, isNodeValuedField } from "./get-node-prop-names";
export { RESERVED_RENDER_PROPS } from "./split-props";
