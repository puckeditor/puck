import styles from "./styles.module.css";
import { ReactNode } from "react";
import { getClassNameFactory } from "../../../../lib";

const getClassName = getClassNameFactory("Nav", styles);
const getClassNameItem = getClassNameFactory("NavItem", styles);

export type MenuItem = {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  isActive?: boolean;
  mobileOnly?: boolean;
};

export const MenuItem = ({
  label,
  icon,
  onClick,
  isActive,
  mobileOnly,
}: MenuItem) => {
  return (
    <li className={getClassNameItem({ active: isActive, mobileOnly })}>
      {onClick && (
        <div className={getClassNameItem("link")} onClick={onClick}>
          {icon && <span className={getClassNameItem("linkIcon")}>{icon}</span>}
          <span className={getClassNameItem("linkLabel")}>{label}</span>
        </div>
      )}
    </li>
  );
};

export const Nav = ({
  items,
  mobileActions,
}: {
  items: Record<string, MenuItem>;
  mobileActions?: ReactNode;
}) => {
  return (
    <nav className={getClassName()}>
      <ul className={getClassName("list")}>
        {Object.entries(items).map(([key, item]) => (
          <MenuItem key={key} {...item} />
        ))}
      </ul>
      {mobileActions && (
        <div className={getClassName("mobileActions")}>{mobileActions}</div>
      )}
    </nav>
  );
};
