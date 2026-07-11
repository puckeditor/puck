import {
  createVNode,
  render as vueRender,
  shallowReactive,
  defineComponent,
  provide,
  h as vueH,
  type AppContext,
} from "vue";
import {
  patchProps,
  RENDER_DROPZONE_KEY,
  CHILDREN_KEY,
  type FrameworkAdapter,
  type Split,
  type MountedInstance,
} from "./shim";
import type { VueComponent } from "./types";
import { PUCK_INJECTION_KEY } from "./composables/use-puck";
import { createOutlet } from "./bridge/outlet";

/**
 * The Vue `FrameworkAdapter`: the only ~60 lines of Vue-bound bridging the
 * shared shim needs. Everything else (host div, portals, thunks, lifecycle,
 * config walker, editor/render hosts) is generic Preact machinery in
 * `@puckeditor/framework-shim`.
 *
 * `appContext` — the `_context` of an (unmounted) Vue app instance — is threaded
 * into every mounted Vue root so shared plugins / provides (e.g. Pinia) are
 * available. A fresh adapter is created per `appContext` (cheap: just closures).
 */
export const makeVueAdapter = (
  appContext: AppContext | null = null
): FrameworkAdapter => ({
  // Vue outlets are `<component :is>` components with stable identity.
  createOutlet: (registry, thunkKey) => createOutlet(registry, thunkKey),

  // Slot props → outlet components; imperative DropZone → puck context; root
  // children → children outlet.
  decorateComponentSplit: (split, { outlets, slotPropNames, isRoot }) => {
    for (const name of slotPropNames) split.props[name] = outlets[name];
    (split.puck as any).renderDropZone = outlets[RENDER_DROPZONE_KEY];
    if (isRoot) split.props.children = outlets[CHILDREN_KEY];
  },

  // Only fieldTypes overrides pass `children`; expose it as an outlet.
  decorateFieldProps: (props, { outlet, hasChildren }) => {
    if (hasChildren) props.children = outlet;
  },

  mountComponent: ({ el, comp, split }): MountedInstance => {
    const reactiveProps = shallowReactive(split.props);
    const reactivePuck = shallowReactive(split.puck as Record<string, any>);

    const Wrapper = defineComponent({
      name: "PuckVueBridge",
      setup() {
        provide(PUCK_INJECTION_KEY, reactivePuck as any);
        return () => vueH(comp as VueComponent as any, { ...reactiveProps });
      },
    });

    const vnode = createVNode(Wrapper);
    vnode.appContext = appContext ?? null;
    vueRender(vnode, el);

    return {
      patch: (next: Split) => {
        patchProps(reactiveProps, next.props);
        patchProps(reactivePuck, next.puck as Record<string, any>);
      },
      unmount: () => {
        vueRender(null, el);
      },
    };
  },

  mountField: ({ el, comp, props, storeApi }): MountedInstance => {
    const reactive = shallowReactive(withFieldVModel(props));

    // Minimal puck context for field UIs: fields only render inside <Puck>,
    // and `storeApi` powers `usePuckApi` from custom fields.
    const fieldPuck = shallowReactive({
      isEditing: true,
      metadata: {},
      ...(storeApi ? { storeApi } : {}),
    });

    const Wrapper = defineComponent({
      name: "PuckVueFieldBridge",
      setup() {
        provide(PUCK_INJECTION_KEY, fieldPuck as any);
        return () => vueH(comp as VueComponent as any, { ...reactive });
      },
    });

    const vnode = createVNode(Wrapper);
    vnode.appContext = appContext ?? null;
    vueRender(vnode, el);

    return {
      patch: (next: Record<string, any>) => {
        patchProps(reactive, withFieldVModel(next));
      },
      unmount: () => {
        vueRender(null, el);
      },
    };
  },
});

/**
 * Add the Vue-idiomatic `v-model` contract to a field's props: `modelValue`
 * mirrors `value` and `update:modelValue` forwards to `onChange`, so a field
 * component can use `defineModel()`. The original `value`/`onChange` stay for
 * parity with core's contract.
 */
const withFieldVModel = (
  props: Record<string, any>
): Record<string, any> => ({
  ...props,
  modelValue: props.value,
  "onUpdate:modelValue": props.onChange,
});
