import type { NodeViewBinding, ViewValueOption } from "../../types";

const isSameOption = (option: ViewValueOption, comparison: ViewValueOption) =>
  option.viewId === comparison.viewId &&
  option.path === comparison.path &&
  option.expression === comparison.expression;

export const getBindingOptionSections = ({
  binding,
  allOptions,
  visibleOptions,
}: {
  binding?: NodeViewBinding | null;
  allOptions: ViewValueOption[];
  visibleOptions: ViewValueOption[];
}) => {
  const selectedOption = binding
    ? allOptions.find(
        (option) =>
          option.viewId === binding.viewId && option.path === binding.path
      ) ?? null
    : null;

  return {
    selectedOption,
    remainingOptions: visibleOptions,
  };
};
