import { useComponentList } from "../../../../lib/use-component-list";
import { useAppStore } from "../../../../store";
import { ComponentList } from "../../../ComponentList";
import { useMemo } from "react";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../../../lib";

const getClassName = getClassNameFactory("Components", styles);

export const Components = () => {
  const overrides = useAppStore((s) => s.overrides);

  const componentList = useComponentList();

  const Wrapper = useMemo(() => {
    // DEPRECATED
    if (overrides.components) {
      console.warn(
        "The `components` override has been deprecated and renamed to `drawer`"
      );
    }
    return overrides.components || overrides.drawer || "div";
  }, [overrides]);

  return (
    <div className={getClassName()}>
      <Wrapper>
        {componentList ? componentList : <ComponentList id="all" />}
      </Wrapper>
    </div>
  );
};
