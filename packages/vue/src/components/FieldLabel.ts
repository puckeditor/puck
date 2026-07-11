import { defineComponent, h, type PropType } from "vue";
import {
  fieldLabelClasses,
  fieldLabelLockIconSvg,
} from "../shim";

/**
 * Vue `FieldLabel` — markup/CSS parity with core's `FieldLabel` (class names +
 * lock icon come from core, so they never drift), for building custom Vue
 * fields that look native. Slots: `#icon` (optional label icon) and default
 * (the field control).
 *
 * ```vue
 * <FieldLabel label="Title"><input v-model="..." /></FieldLabel>
 * ```
 */
export const FieldLabel = defineComponent({
  name: "FieldLabel",
  props: {
    label: { type: String, default: "" },
    el: { type: String as PropType<"label" | "div">, default: "label" },
    readOnly: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () =>
      h(props.el, { class: fieldLabelClasses.root(props.readOnly) }, [
        h("div", { class: fieldLabelClasses.label }, [
          slots.icon
            ? h("div", { class: fieldLabelClasses.labelIcon }, [slots.icon()])
            : null,
          props.label,
          props.readOnly
            ? h("div", {
                class: fieldLabelClasses.disabledIcon,
                title: "Read-only",
                innerHTML: fieldLabelLockIconSvg,
              })
            : null,
        ]),
        slots.default ? slots.default() : null,
      ]);
  },
});
