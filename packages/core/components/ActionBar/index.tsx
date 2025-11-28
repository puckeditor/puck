import { ReactNode, SyntheticEvent } from "react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import styles from "./styles.module.css";
const getClassName = getClassNameFactory("ActionBar", styles);
const getActionClassName = getClassNameFactory("ActionBarAction", styles);

export const ActionBar = ({
  label,
  children,
}: {
  label?: string;
  children?: ReactNode;
}) => (
  <div
    className={getClassName()}
    onClick={(e) => {
      e.stopPropagation();
    }}
  >
    {label && (
      <ActionBar.Group>
        <div className={getClassName("label")}>{label}</div>
      </ActionBar.Group>
    )}
    {children}
  </div>
);

export const Action = ({
  children,
  label,
  onClick,
  active = false,
  disabled,
}: {
  children: ReactNode;
  label?: string;
  onClick: (e: SyntheticEvent) => void;
  active?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    className={getActionClassName({ active, disabled })}
    onClick={onClick}
    title={label}
    tabIndex={0}
    disabled={disabled}
  >
    {children}
  </button>
);

export const Group = ({ children }: { children: ReactNode }) => (
  <div className={getClassName("group")}>{children}</div>
);

export const Label = ({ label }: { label: string }) => (
  <div className={getClassName("label")}>{label}</div>
);

export const Separator = () => <div className={getClassName("separator")} />;

ActionBar.Action = Action;
ActionBar.Label = Label;
ActionBar.Group = Group;
ActionBar.Separator = Separator;
