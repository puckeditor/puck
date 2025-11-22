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
}: {
  children: ReactNode;
  options: { icon?: React.FC; label: string; value: string }[];
  onChange: (val: any) => void;
  value: any;
  defaultValue?: any;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={getClassName({ hasValue: value !== defaultValue })}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={getClassName("button")}>
            {children}
            <ChevronDown size={12} />
          </button>
        </PopoverTrigger>

        <PopoverPortal>
          <PopoverContent sideOffset={8} align="start">
            <ul className={getClassName("items")}>
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
      </Popover>
    </div>
  );
};
