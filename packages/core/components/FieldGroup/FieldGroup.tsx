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
const getBoxClassName = getClassNameFactory("FieldGroup-box", styles);

export type FieldGroupVariant = "flush" | "card";

type NonCollapsibleFieldGroupProps = { collapsible: false; label?: string };

type CollapsibleFieldGroupProps = { collapsible?: true; label: string };

type FieldGroupProps = {
  variant?: FieldGroupVariant;
  icon?: ReactNode;
  children?: ReactNode;
  id?: string;
  defaultExpanded?: boolean;
} & (NonCollapsibleFieldGroupProps | CollapsibleFieldGroupProps);

type FieldGroupInternalProps = {
  variant?: FieldGroupVariant;
  collapsible?: boolean;
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
  variant = "flush",
  collapsible = false,
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
    <div
      id={contentId}
      className={getBoxClassName({
        flush: variant === "flush",
        card: variant === "card",
      })}
    >
      <fieldset className={getClassName("fieldset")}>{children}</fieldset>
    </div>
  );

  if (collapsible) {
    const toggleIcon = (
      <span className={getClassName("toggleIcon")}>
        <ChevronDown size={16} />
      </span>
    );

    return (
      <div
        className={getClassName({
          collapsed: !expanded,
          expanded,
          flush: variant === "flush",
        })}
        data-puck-field-group-collapsible
      >
        <button
          type="button"
          className={getClassName("toggle")}
          aria-expanded={expanded}
          aria-controls={expanded ? contentId : undefined}
          onClick={() => onToggle?.(!expanded)}
        >
          {label ? (
            // Collapsible groups need a visible label, so it always uses Puck's
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
    <div className={getClassName({ flush: variant === "flush" })}>
      <Label label={label} icon={icon} el="div" readOnly={readOnly}>
        {content}
      </Label>
    </div>
  );
};

/** Renders a group of related fields under a common label and layout */
export const FieldGroup = ({
  collapsible = true,
  ...props
}: FieldGroupProps) => {
  const defaultStoreId = useSafeId();

  const { expanded, toggleExpanded, unsetExpanded } = useExpandedFieldGroup({
    fieldGroupKey: props.id ?? defaultStoreId,
    defaultExpanded: props.defaultExpanded,
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
      collapsible={collapsible}
      expanded={expanded}
      onToggle={toggleExpanded}
    />
  );
};

type FieldGroupItemProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Renders an item within a FieldGroup for internal use.
 *
 * The difference with the public FieldGroup.Item component
 * is that this one can mark the item as a collapsible group, so it's spaced like one.
 */
export const FieldGroupItemInternal = ({
  children,
  className,
  collapsible = false,
}: FieldGroupItemProps & { collapsible?: boolean }) => (
  <div
    className={mergeClassNames(getClassName("item"), className)}
    data-puck-field-group-collapsible={collapsible || undefined}
  >
    {children}
  </div>
);

const FieldGroupItem = (props: FieldGroupItemProps) => (
  <FieldGroupItemInternal {...props} />
);

/**
 * Renders an individual item within a FieldGroup.
 *
 * Wrap any subfields in this component for a consistent layout
 */
FieldGroup.Item = FieldGroupItem;
