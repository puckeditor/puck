import { ReactNode, SyntheticEvent } from "react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import styles from "./styles.module.css";
const getClassName = getClassNameFactory("ActionBar", styles);

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
  disabled
}: {
  children: ReactNode;
  label?: string;
  onClick: (e: SyntheticEvent) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    className={getClassName("action")}
    onClick={onClick}
    title={label}
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

ActionBar.Action = Action;
ActionBar.Label = Label;
ActionBar.Group = Group;
