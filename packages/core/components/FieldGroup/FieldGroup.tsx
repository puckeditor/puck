import React, { useEffect, Children, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import mergeClassNames from "../../lib/merge-class-names";
import { useSafeId } from "../../lib/use-safe-id";
import { FieldLabel, FieldLabelInternal } from "../AutoField/FieldLabel";
import type { FieldLabelPropsInternal } from "../AutoField/FieldLabel";
import styles from "./styles.module.css";
import useExpandedFieldGroup from "./lib/use-field-group-expanded";

const getClassName = getClassNameFactory("FieldGroup", styles);

type NonExpandableFieldGroupProps = { expandable?: false; label?: string };

type ExpandableFieldGroupProps = { expandable: true; label: string };

type FieldGroupProps = {
  icon?: ReactNode;
  children?: ReactNode;
  id?: string;
} & (NonExpandableFieldGroupProps | ExpandableFieldGroupProps);

type FieldGroupInternalProps = {
  expandable?: boolean;
  label?: string;
  icon?: ReactNode;
  children?: ReactNode;
  Label?: React.FC<FieldLabelPropsInternal>;
  readOnly?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
};

/**
 * Renders a field group for internal use.
 *
 * The difference with the public FieldGroup component
 * is that this one allows replacing the component used for the `Label`
 * and is controlled.
 *
 * The custom Label is needed for use within AutoField, since it replaces the label based on where it is used
 * (standalone public AutoField vs AutoField used to render a field config).
 */
export const FieldGroupInternal = ({
  expandable = false,
  label,
  icon,
  children,
  Label = FieldLabelInternal,
  readOnly,
  expanded = false,
  onToggle,
}: FieldGroupInternalProps) => {
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

  if (expandable) {
    const toggleIcon = (
      <span className={getClassName("toggleIcon")}>
        <ChevronDown size={16} />
      </span>
    );

    return (
      <div
        className={getClassName({ collapsed: !expanded, expanded })}
        data-puck-field-group-expandable
      >
        <button
          type="button"
          className={getClassName("toggle")}
          aria-expanded={expanded}
          aria-controls={expanded ? contentId : undefined}
          onClick={() => onToggle?.(!expanded)}
        >
          {label ? (
            // Expandable groups need a visible label, so it always uses Puck's
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
    <div className={getClassName()}>
      <Label label={label} icon={icon} el="div" readOnly={readOnly}>
        {content}
      </Label>
    </div>
  );
};

/** Renders a group of related fields under a common label and layout */
export const FieldGroup = (props: FieldGroupProps) => {
  const defaultStoreId = useSafeId();

  const { expanded, toggleExpanded, unsetExpanded } = useExpandedFieldGroup({
    fieldGroupKey: props.id ?? defaultStoreId,
  });

  // Unset the expanded state when the component is unmounted and no explicit id is provided
  useEffect(() => {
    return () => {
      if (!props.id) {
        unsetExpanded();
      }
    };
  }, [unsetExpanded, props.id]);

  return (
    <FieldGroupInternal
      {...props}
      expanded={expanded}
      onToggle={toggleExpanded}
    />
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
