import { useComponentList } from "../../../../lib/use-component-list";
import { useAppStore } from "../../../../store";
import { ComponentList } from "../../../ComponentList";
import { useMemo } from "react";

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
    <Wrapper>
      {componentList ? componentList : <ComponentList id="all" />}
    </Wrapper>
  );
};
