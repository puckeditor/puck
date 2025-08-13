import { ReactNode } from "react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Heading } from "../Heading";
import { Loader } from "../Loader";
import { Breadcrumbs } from "../Breadcrumbs";

const getClassName = getClassNameFactory("SidebarSection", styles);

export const SidebarSection = ({
  children,
  title,
  background,
  showBreadcrumbs,
  noBorderTop,
  noPadding,
  isLoading,
}: {
  children: ReactNode;
  title: ReactNode;
  background?: string;
  showBreadcrumbs?: boolean;
  noBorderTop?: boolean;
  noPadding?: boolean;
  isLoading?: boolean | null;
}) => {
  return (
    <div
      className={getClassName({ noBorderTop, noPadding })}
      style={{ background }}
    >
      <div className={getClassName("title")}>
        <div className={getClassName("breadcrumbs")}>
          {showBreadcrumbs && <Breadcrumbs />}
          <div className={getClassName("heading")}>
            <Heading rank="2" size="xs">
              {title}
            </Heading>
          </div>
        </div>
      </div>
      <div className={getClassName("content")}>{children}</div>
      {isLoading && (
        <div className={getClassName("loadingOverlay")}>
          <Loader size={32} />
        </div>
      )}
    </div>
  );
};
