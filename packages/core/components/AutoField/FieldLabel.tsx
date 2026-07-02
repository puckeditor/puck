import getClassNameFactory from "../../lib/get-class-name-factory";
import { Field, FieldProps } from "../../types";

import styles from "./styles.module.css";
import { ReactNode, useMemo } from "react";
import { Lock } from "lucide-react";
import { useAppStore } from "../../store";
import { useMessage } from "../../lib/use-message";

const getClassName = getClassNameFactory("Input", styles);

export const FieldLabel = ({
  children,
  icon,
  label,
  el = "label",
  readOnly,
  className,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  label: string;
  el?: "label" | "div";
  readOnly?: boolean;
  className?: string;
}) => {
  const El = el;
  const readOnlyLabel = useMessage("field-readonly");

  return (
    <El className={className}>
      <div className={getClassName("label")}>
        {icon ? <div className={getClassName("labelIcon")}>{icon}</div> : <></>}
        {label}

        {readOnly && (
          <div className={getClassName("disabledIcon")} title={readOnlyLabel}>
            <Lock size="12" />
          </div>
        )}
      </div>
      {children}
    </El>
  );
};

export type FieldLabelPropsInternal = {
  children?: ReactNode;
  icon?: ReactNode;
  label?: string;
  el?: "label" | "div";
  readOnly?: boolean;
};

export const FieldLabelInternal = ({
  children,
  icon,
  label,
  el = "label",
  readOnly,
}: FieldLabelPropsInternal) => {
  const overrides = useAppStore((s) => s.overrides);

  const Wrapper = useMemo(
    () => overrides.fieldLabel || FieldLabel,
    [overrides]
  );

  if (!label) {
    return <>{children}</>;
  }

  return (
    <Wrapper
      label={label}
      icon={icon}
      className={getClassName({ readOnly })}
      readOnly={readOnly}
      el={el}
    >
      {children}
    </Wrapper>
  );
};

export type FieldPropsInternalOptional<ValueType = any, F = Field<any>> = Omit<
  FieldProps<F, ValueType>,
  "value"
> & {
  Label?: React.FC<FieldLabelPropsInternal>;
  label?: string;
  labelIcon?: ReactNode;
  name?: string;
};

export type FieldPropsInternal<ValueType = any, F = Field<any>> = FieldProps<
  F,
  ValueType
> & {
  Label: React.FC<FieldLabelPropsInternal>;
  label?: string;
  labelIcon?: ReactNode;
  id: string;
  name?: string;
};
