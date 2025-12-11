import { ReactNode, SyntheticEvent } from "react";
import { IconButton } from "../../../IconButton";
import { Action } from "../../../ActionBar";
import { getClassNameFactory } from "../../../../lib";
import styles from "./styles.module.css";
import { useControlContext } from "../../lib/use-control-context";

const getClassName = getClassNameFactory("Control", styles);

export function Control({
  icon,
  disabled,
  active,
  onClick,
  title,
}: {
  icon: ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick: (e: SyntheticEvent) => any;
  title: string;
}) {
  const { inline } = useControlContext();

  if (inline) {
    return (
      <span className={getClassName({ inline: true })}>
        <Action
          onClick={onClick}
          disabled={disabled}
          active={active}
          label={title}
        >
          {icon}
        </Action>
      </span>
    );
  }

  return (
    <span className={getClassName()}>
      <IconButton
        onClick={onClick}
        disabled={disabled}
        active={active}
        title={title}
      >
        {icon}
      </IconButton>
    </span>
  );
}
