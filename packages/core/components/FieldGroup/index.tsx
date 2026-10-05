import { Children, ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import mergeClassNames from "../../lib/merge-class-names";
import { useSafeId } from "../../lib/use-safe-id";
import { FieldLabelInternal } from "../AutoField/FieldLabel";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("FieldGroup", styles);

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

export const FieldGroup = ({
  variant = "contained",
  label,
  icon,
  children,
}: FieldGroupProps) => {
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
          <FieldLabelInternal
            label={label}
            icon={
              <span className={getClassName("toggleIcon")}>
                {icon ?? <ChevronRight size={16} />}
              </span>
            }
            el="div"
          />
        </button>
        {expanded && content}
      </div>
    );
  }

  return (
    <div data-puck-field-group className={getClassName()}>
      <FieldLabelInternal label={label} icon={icon} el="div">
        {content}
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
