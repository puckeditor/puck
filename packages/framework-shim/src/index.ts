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
export { nextUid, RENDER_DROPZONE_KEY, CHILDREN_KEY } from "./registry";
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
export type { Split, PuckContext } from "./split-props";
