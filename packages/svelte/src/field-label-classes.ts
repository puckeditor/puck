import getClassNameFactory from "../../core/lib/get-class-name-factory";
// The same CSS module core's FieldLabel uses — bundled via the core graph, so
// these hashed class names line up with dist/index.css. Resolved HERE (compiled
// layer) so `FieldLabel.svelte` (host-compiled source layer) can apply
// core-parity classes without importing core's CSS module itself.
import styles from "../../core/components/AutoField/styles.module.css";

const getClassName = getClassNameFactory("Input", styles);

export const fieldLabelClasses = {
  root: (readOnly: boolean) => getClassName({ readOnly }),
  label: getClassName("label"),
  labelIcon: getClassName("labelIcon"),
  disabledIcon: getClassName("disabledIcon"),
};
