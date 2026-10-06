import { Children, ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import mergeClassNames from "../../lib/merge-class-names";
import { useSafeId } from "../../lib/use-safe-id";
import { FieldLabel, FieldLabelInternal } from "../AutoField/FieldLabel";
import type { FieldLabelPropsInternal } from "../AutoField/FieldLabel";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("FieldGroup", styles);

type FieldGroupVariant = "contained" | "collapsible";

type FieldContainedVariantProps = {
  variant?: "contained";
  label?: string;
};

type FieldCollapsibleVariantProps = {
  variant: "collapsible";
  label: string;
};

type FieldGroupProps = {
  icon?: ReactNode;
  children?: ReactNode;
} & (FieldContainedVariantProps | FieldCollapsibleVariantProps);

type FieldGroupInternalProps = {
  variant?: FieldGroupVariant;
  label?: string;
  icon?: ReactNode;
  children?: ReactNode;
  Label?: React.FC<FieldLabelPropsInternal>;
  readOnly?: boolean;
};

/**
 * Renders a field group for internal use.
 *
 * The difference with the public FieldGroup component
 * is that this one allows replacing the component used for the `Label`.
 *
 * This is needed for use within AutoField, since it replaces the label based on where it is used
 * (standalone public AutoField vs AutoField used to render a field config).
 */
export const FieldGroupInternal = ({
  variant = "contained",
  label,
  icon,
  children,
  Label = FieldLabelInternal,
  readOnly,
}: FieldGroupInternalProps) => {
  const [expanded, setExpanded] = useState(false);
  const contentId = useSafeId();

  // Don't render anything if the only content is whitespace
  const hasContent = Children.toArray(children).some(
    (child) => typeof child !== "string" || child.trim() !== ""
  );

  if (!hasContent) return null;

  const content = (
    <div id={contentId} className={getClassName("box")}>
      <fieldset className={getClassName("fieldset")}>{children}</fieldset>
    </div>
  );

  if (variant === "collapsible") {
    const toggleIcon = (
      <span className={getClassName("toggleIcon")}>
        <ChevronDown size={16} />
      </span>
    );

    return (
      <div
        data-puck-field-group
        className={getClassName({ collapsed: !expanded, expanded })}
      >
        <button
          data-puck-field-group-toggle
          type="button"
          className={getClassName("toggle")}
          aria-expanded={expanded}
          aria-controls={expanded ? contentId : undefined}
          onClick={() => setExpanded((isExpanded) => !isExpanded)}
        >
          {label ? (
            // Collapsible fields need a visible label, so it always uses Puck's
            <FieldLabelInternal
              label={label}
              icon={icon}
              endIcon={toggleIcon}
              el="div"
              readOnly={readOnly}
            />
          ) : (
            // Without a label, only show the icons, so the missing label is easy to spot
            <FieldLabel
              label=""
              icon={icon}
              endIcon={toggleIcon}
              el="div"
              readOnly={readOnly}
            />
          )}
        </button>
        {expanded && content}
      </div>
    );
  }

  return (
    <div data-puck-field-group className={getClassName()}>
      <Label label={label} icon={icon} el="div" readOnly={readOnly}>
        {content}
      </Label>
    </div>
  );
};

/** Renders a group of related fields under a common label and layout */
export const FieldGroup = (props: FieldGroupProps) => (
  <FieldGroupInternal {...props} />
);

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
