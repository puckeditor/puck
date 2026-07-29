import { forwardRef, ReactNode, SyntheticEvent } from "react";
import { GripVertical } from "lucide-react";
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

export const Action = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    label?: string;
    onClick?: (e: SyntheticEvent) => void;
    active?: boolean;
    disabled?: boolean;
  }
>(({ children, label, onClick, active = false, disabled, ...rest }, ref) => (
  <button
    type="button"
    {...rest}
    ref={ref}
    className={getActionClassName({ active, disabled })}
    onClick={onClick}
    title={label}
    tabIndex={0}
    disabled={disabled}
  >
    {children}
  </button>
));

Action.displayName = "Action";

export const DragHandle = forwardRef<
  HTMLButtonElement,
  {
    label?: string;
    disabled?: boolean;
  }
>(({ label, disabled, ...rest }, ref) => (
  <button
    type="button"
    {...rest}
    ref={ref}
    className={getActionClassName({ disabled, grab: !disabled })}
    title={label}
    aria-label={label}
    tabIndex={0}
    disabled={disabled}
    // Drags are driven by the DnD sensor; stop clicks selecting the component.
    onClick={(e) => e.stopPropagation()}
  >
    <GripVertical size={16} />
  </button>
));

DragHandle.displayName = "DragHandle";

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
ActionBar.DragHandle = DragHandle;
