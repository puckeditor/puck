import { useControlContext } from "../../lib/use-control-context";
import { AlignLeft } from "lucide-react";
import { SelectControl } from "../../components/SelectControl";
import { useAlignOptions, AlignDirection } from "./use-options";

export function AlignSelectFallback() {
  const ctx = useControlContext();
  const alignOptions = useAlignOptions(ctx.options);

  return (
    <SelectControl<AlignDirection>
      options={alignOptions}
      onChange={() => {}}
      value="left"
      defaultValue="left"
      renderDefaultIcon={AlignLeft}
    />
  );
}
