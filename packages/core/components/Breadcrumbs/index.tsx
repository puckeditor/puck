import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ChevronRight } from "lucide-react";
import { useBreadcrumbs } from "../../lib/use-breadcrumbs";
import { useAppStore } from "../../store";
import { ReactNode } from "react";

const getClassName = getClassNameFactory("Breadcrumbs", styles);

export const Breadcrumbs = ({
  children,
  numParents = 1,
}: {
  children?: ReactNode;
  numParents?: number;
}) => {
  const setUi = useAppStore((s) => s.setUi);
  const breadcrumbs = useBreadcrumbs(numParents);

  return (
    <div className={getClassName()}>
      {breadcrumbs.map((breadcrumb, i) => (
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
      ))}
      {children}
    </div>
  );
};
