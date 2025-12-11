import { Heading } from "lucide-react";
import { SelectControl } from "../../components/SelectControl";
import { useControlContext } from "../../lib/use-control-context";
import { HeadingElement, useHeadingOptions } from "./use-options";

export function HeadingSelectFallback() {
  const ctx = useControlContext();
  const headingOptions = useHeadingOptions(ctx.options);

  return (
    <SelectControl<HeadingElement | "p">
      options={headingOptions}
      onChange={() => {}}
      value="p"
      defaultValue="p"
      renderDefaultIcon={Heading}
    />
  );
}
