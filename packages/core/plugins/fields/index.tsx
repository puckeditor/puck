import type { ReactNode } from "react";
import { FormInput } from "lucide-react";
import { useAppStore } from "../../store";
import { useMessage } from "../../lib/use-message";
import { PluginInternal } from "../../types/Internal";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Fields } from "../../components/Puck/components/Fields";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";

const getClassName = getClassNameFactory("FieldsPlugin", styles);

const CurrentTitle = () => {
  const pageLabel = useMessage("label-page");
  const label = useAppStore((s) => {
    const selectedItem = s.selectedItem;

    return selectedItem
      ? s.config.components[selectedItem.type]?.label ?? selectedItem.type
      : null;
  });

  return label ?? pageLabel;
};

export const fieldsPlugin: (params?: {
  desktopSideBar?: "left" | "right";
  label?: string;
  icon?: ReactNode;
}) => PluginInternal = ({ desktopSideBar = "right", label, icon } = {}) => ({
  name: "fields",
  label: label ?? "Fields",
  render: () => (
    <div className={getClassName()}>
      <div className={getClassName("header")}>
        <Breadcrumbs numParents={2}>
          <CurrentTitle />
        </Breadcrumbs>
      </div>
      <Fields />
    </div>
  ),
  icon: icon ?? <FormInput />,
  mobileOnly: desktopSideBar === "right",
});
