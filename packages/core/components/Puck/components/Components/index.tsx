import { useComponentList } from "../../../../lib/use-component-list";
import { useAppStore } from "../../../../store";
import { ComponentList } from "../../../ComponentList";
import { useMemo } from "react";

export const Components = () => {
  const overrides = useAppStore((s) => s.overrides);

  const componentList = useComponentList();

  const Wrapper = useMemo(() => overrides.components || "div", [overrides]);

  return (
    <Wrapper>
      {componentList ? componentList : <ComponentList id="all" />}
    </Wrapper>
  );
};
