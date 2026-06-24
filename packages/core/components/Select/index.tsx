import styles from "./styles.module.css";
import { ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { getClassNameFactory } from "../../lib";
import { IconButton } from "../IconButton";
import { Action } from "../ActionBar";

const getClassName = getClassNameFactory("Select", styles);
const getItemClassName = getClassNameFactory("SelectItem", styles);

const Item = ({
  children,
  isSelected,
  onClick,
}: {
  children: ReactNode;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button className={getItemClassName({ isSelected })} onClick={onClick}>
      {children}
    </button>
  );
};

export const Select = ({
  children,
  options,
  onChange,
  value,
  defaultValue,
  mode,
  disabled = false,
}: {
  children: ReactNode;
  options: { icon?: React.FC; label: string; value: string }[];
  onChange: (val: any) => void;
  value: any;
  defaultValue?: any;
  mode: "actionBar" | "standalone";
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const hasOptions = options.length > 0;
  const isDisabled = disabled || !hasOptions;

  const buttonInner = (
    <div className={getClassName("buttonInner")}>
      <span className={getClassName("buttonIcon")}>{children}</span>
      <ChevronDown size={12} />
    </div>
  );

  const trigger =
    mode === "actionBar" ? (
      <Action active={value !== defaultValue} disabled={isDisabled}>
        {buttonInner}
      </Action>
    ) : (
      <IconButton
        title="Select"
        active={value !== defaultValue}
        disabled={isDisabled}
      >
        {buttonInner}
      </IconButton>
    );

  return (
    <div
      className={getClassName({
        actionBar: mode === "actionBar",
        standalone: mode === "standalone",
      })}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {hasOptions ? (
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        ) : (
          trigger
        )}

        {options.length > 0 && (
          <PopoverPortal>
            <PopoverContent align="start">
              <ul className={getClassName("items")} data-puck-rte-menu>
                {options.map((option) => {
                  const Icon: any = option.icon;

                  return (
                    <li key={option.value}>
                      <Item
                        isSelected={value === option.value}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        {Icon && (
                          <div className={getItemClassName("icon")}>
                            <Icon size={16} />
                          </div>
                        )}
                        {option.label}
                      </Item>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </PopoverPortal>
        )}
      </Popover>
    </div>
  );
};
