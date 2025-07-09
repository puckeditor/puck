import { ReactNode } from "react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Heading } from "../Heading";
import { ChevronRight } from "lucide-react";
import { useBreadcrumbs } from "../../lib/use-breadcrumbs";
import { useAppStore } from "../../store";
import { Loader } from "../Loader";

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
  const setUi = useAppStore((s) => s.setUi);
  const breadcrumbs = useBreadcrumbs(1);

  return (
    <div
      className={getClassName({ noBorderTop, noPadding })}
      style={{ background }}
    >
      <div className={getClassName("title")}>
        <div className={getClassName("breadcrumbs")}>
          {showBreadcrumbs
            ? breadcrumbs.map((breadcrumb, i) => (
                <div key={i} className={getClassName("breadcrumb")}>
                  <button
                    type="button"
                    className={getClassName("breadcrumbLabel")}
                    onClick={() => setUi({ itemSelector: breadcrumb.selector })}
                  >
                    {breadcrumb.label}
                  </button>
                  <ChevronRight size={16} />
                </div>
              ))
            : null}
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
