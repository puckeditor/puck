import { defineComponent, h, type PropType } from "vue";
import getClassNameFactory from "../../../core/lib/get-class-name-factory";
// The same CSS-module core's FieldLabel uses — already bundled via the core
// graph, so these hashed class names line up with dist/index.css.
import styles from "../../../core/components/AutoField/styles.module.css";

const getClassName = getClassNameFactory("Input", styles);

// Inline lucide "lock" icon (core uses lucide-react's <Lock size="12" />).
const LockIcon = () =>
  h(
    "svg",
    {
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    [
      h("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }),
      h("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }),
    ]
  );

/**
 * Vue `FieldLabel` — markup/CSS parity with core's `FieldLabel`, for building
 * custom Vue fields that look native. Slots: `#icon` (optional label icon) and
 * default (the field control).
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
      h(props.el, { class: getClassName({ readOnly: props.readOnly }) }, [
        h("div", { class: getClassName("label") }, [
          slots.icon
            ? h("div", { class: getClassName("labelIcon") }, [slots.icon()])
            : null,
          props.label,
          props.readOnly
            ? h(
                "div",
                { class: getClassName("disabledIcon"), title: "Read-only" },
                [LockIcon()]
              )
            : null,
        ]),
        slots.default ? slots.default() : null,
      ]);
  },
});
