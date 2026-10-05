import { Children, ReactNode } from "react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import mergeClassNames from "../../lib/merge-class-names";
import { FieldLabelInternal } from "../AutoField/FieldLabel";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("FieldGroup", styles);

export const FieldGroup = ({
  label,
  icon,
  children,
}: {
  label?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) => {
  // Don't render anything if the only content is whitespace
  const hasContent = Children.toArray(children).some(
    (child) => typeof child !== "string" || child.trim() !== ""
  );

  if (!hasContent) return null;

  return (
    <div data-puck-field-group>
      <FieldLabelInternal label={label} icon={icon} el="div">
        <div className={getClassName()}>
          <fieldset className={getClassName("fieldset")}>{children}</fieldset>
        </div>
      </FieldLabelInternal>
    </div>
  );
};

/**
 * Renders an individual item within a FieldGroup.
 *
 * Wrap any subfields in this component for a consistent layout
 */
export const FieldGroupItem = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={mergeClassNames(getClassName("item"), className)}>
    {children}
  </div>
);
