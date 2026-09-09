import { forwardRef, ReactNode, SyntheticEvent, useState } from "react";
import styles from "./IconButton.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Loader } from "../Loader";

const getClassName = getClassNameFactory("IconButton", styles);

export const IconButton = forwardRef<
  HTMLButtonElement & HTMLAnchorElement,
  {
    active?: boolean;
    children: ReactNode;
    href?: string;
    onClick?: (e: SyntheticEvent) => void | Promise<void>;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    tabIndex?: number;
    newTab?: boolean;
    fullWidth?: boolean;
    title: string;
    suppressHydrationWarning?: boolean;
  }
>(
  (
    {
      active = false,
      children,
      href,
      onClick,
      type,
      disabled,
      tabIndex,
      newTab,
      fullWidth,
      title,
      suppressHydrationWarning,
      ...rest
    },
    ref
  ) => {
    const [loading, setLoading] = useState(false);

    const ElementType = href ? "a" : "button";

    return (
      <ElementType
        {...rest}
        ref={ref}
        className={getClassName({
          active,
          disabled,
          fullWidth,
        })}
        onClick={(e) => {
          if (!onClick) return;

          setLoading(true);
          Promise.resolve(onClick(e)).then(() => {
            setLoading(false);
          });
        }}
        type={type}
        disabled={disabled || loading}
        tabIndex={tabIndex}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer" : undefined}
        href={href}
        title={title}
        aria-label={title}
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {children}
        {loading && (
          <>
            &nbsp;&nbsp;
            <Loader size={14} />
          </>
        )}
      </ElementType>
    );
  }
);

IconButton.displayName = "IconButton";
