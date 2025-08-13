import { FormInput } from "lucide-react";
import { useAppStore } from "../../store";
import { PluginInternal } from "../../types/Internal";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Fields } from "../../components/Puck/components/Fields";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";

const getClassName = getClassNameFactory("FieldsPlugin", styles);

const CurrentTitle = () => {
  const label = useAppStore((s) => {
    const selectedItem = s.selectedItem;

    return selectedItem
      ? s.config.components[selectedItem.type]?.label ?? selectedItem.type
      : "Page";
  });

  return label;
};

export const fieldsPlugin: (params?: {
  mobileOnly?: boolean;
}) => PluginInternal = ({ mobileOnly = true } = {}) => ({
  name: "fields",
  label: "Fields",
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
  icon: <FormInput />,
  mobileOnly,
});
