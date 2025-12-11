import { deepEqual } from "fast-equals";
import { ComponentType, memo } from "react";
import { shallowEqual } from "../../lib/shallow-equal";

const RenderComponent = ({
  Component,
  componentProps: renderProps,
}: {
  Component: ComponentType<any>;
  componentProps: any;
}) => {
  return <Component {...renderProps} />;
};

/**　Renders the Component and only re-renders when its props change using shallow comparison. Uses deep comparison for the "puck" prop. */
export const MemoizeComponent = memo(RenderComponent, (prev, next) => {
  let puckEquals = true;
  if ("puck" in prev.componentProps && "puck" in next.componentProps) {
    puckEquals = deepEqual(prev.componentProps.puck, next.componentProps.puck);
  }

  return (
    prev.Component === next.Component &&
    shallowEqual(prev.componentProps, next.componentProps, ["puck"]) &&
    puckEquals
  );
});
