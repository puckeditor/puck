import { useEffect } from "./runtime";
import { useGetPuck } from "./core";

/**
 * A tiny Preact component mounted inside `<Puck>` (via `overrides.puck`, so it
 * lives inside the Puck store context without replacing the editor layout). It
 * grabs the imperative `getPuck` accessor and hands it to the framework exactly
 * once via the `onReady` callback. Framework users can then call `getPuck()` to
 * read fresh state or `getPuck().dispatch(...)` to drive the editor.
 */
export const ReadyBridge = ({
  onReady,
}: {
  onReady: (getPuck: ReturnType<typeof useGetPuck>) => void;
}) => {
  const getPuck = useGetPuck();

  useEffect(() => {
    onReady(getPuck);
  }, []);

  return null;
};
