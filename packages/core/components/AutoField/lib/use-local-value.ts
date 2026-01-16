import { useCallback, useEffect, useState } from "react";
import { useDeepField } from "./use-deep-field";
import { useIsFocused } from "./use-is-focused";

export const useLocalValue = (path: string, onChange: (val: any) => void) => {
  const value = useDeepField(path);
  const isFocused = useIsFocused(path);

  const [localValue, setLocalValue] = useState(value?.toString());

  const onChangeLocal = useCallback((val: any) => {
    setLocalValue(val);
    onChange(val);
  }, []);

  useEffect(() => {
    // Prevent global state from setting local state if this field is focused
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [isFocused, value]);

  return [localValue ?? "", onChangeLocal];
};
