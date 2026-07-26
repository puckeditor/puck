import { ReactNode } from "react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Heading } from "../Heading";
import { Loader } from "../Loader";
import { Breadcrumbs } from "../Breadcrumbs";
import { InlineLabelEdit } from "../InlineLabelEdit";
import { useAppStore } from "../../store";

const getClassName = getClassNameFactory("SidebarSection", styles);

export const SidebarSection = ({
  children,
  title,
  background,
  showBreadcrumbs,
  noBorderTop,
  isLoading,
}: {
  children: ReactNode;
  title: ReactNode;
  background?: string;
  showBreadcrumbs?: boolean;
  noBorderTop?: boolean;
  isLoading?: boolean | null;
}) => {
  const selectedItem = useAppStore((s) => s.selectedItem);
  return (
    <div className={getClassName({ noBorderTop })} style={{ background }}>
      <div className={getClassName("title")}>
        <div className={getClassName("breadcrumbs")}>
          {showBreadcrumbs && <Breadcrumbs />}
          <div className={getClassName("heading")}>
            <InlineLabelEdit componentId={selectedItem?.props.id}>
              {({ label }) => (
                <Heading rank="2" size="xs">
                  {label}
                </Heading>
              )}
            </InlineLabelEdit>
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
