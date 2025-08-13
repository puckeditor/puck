import styles from "./styles.module.css";
import { ReactNode } from "react";
import { getClassNameFactory } from "../../../../lib";

const getClassName = getClassNameFactory("Nav", styles);
const getClassNameSection = getClassNameFactory("NavSection", styles);
const getClassNameItem = getClassNameFactory("NavItem", styles);

export type MenuItem = {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  items?: Record<string, MenuItem>;
  isActive?: boolean;
  mobileOnly?: boolean;
};

export type NavSection = {
  title?: string;
  items: Record<string, MenuItem>;
};

export const MenuItem = ({
  label,
  icon,
  items,
  onClick,
  isActive,
  mobileOnly,
}: MenuItem) => {
  const showChildren = isActive;

  return (
    <li className={getClassNameItem({ active: isActive, mobileOnly })}>
      {onClick && (
        <div className={getClassNameItem("link")} onClick={onClick}>
          {icon && <span className={getClassNameItem("linkIcon")}>{icon}</span>}
          <span className={getClassNameItem("linkLabel")}>{label}</span>
        </div>
      )}
      {items && showChildren && (
        <ul className={getClassNameItem("list")}>
          {Object.entries(items).map(([key, item]) => (
            <MenuItem key={key} {...item} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const NavSection = ({ title, items }: NavSection) => {
  return (
    <li className={getClassNameSection()}>
      {title && <div className={getClassNameSection("title")}>{title}</div>}
      <ul className={getClassNameSection("list")}>
        {Object.entries(items).map(([key, item]) => (
          <MenuItem key={key} {...item} />
        ))}
      </ul>
    </li>
  );
};

export const Nav = ({
  navigation,
  slim,
  mobileActions,
}: {
  navigation: Record<string, NavSection>;
  slim?: boolean;
  mobileActions?: ReactNode;
}) => {
  return (
    <nav className={getClassName({ slim })}>
      <ul className={getClassName("list")}>
        {Object.entries(navigation).map(([key, section]) => {
          return (
            <NavSection key={key} title={section.title} items={section.items} />
          );
        })}
      </ul>
      {mobileActions && (
        <div className={getClassName("mobileActions")}>{mobileActions}</div>
      )}
    </nav>
  );
};
