import { useCallback, useEffect, useState } from "react";
import { useDeepField } from "./use-deep-field";
import { useIsFocused } from "./use-is-focused";

type UseLocalValueOptions = {
  /**
   * Set false to skip tracking store updates. When false, returns a stable
   * `undefined` value and the untouched `onChange`, so callers won't re-render
   * when the field store value changes.
   */
  tracked?: boolean;
  /**
   * Returned in place of a nullish value.
   */
  fallback?: any;
};

/**
 * Track a field's value in local state, seeded and kept in sync from the field
 * store.
 *
 * The store is a shared channel: the subscription in Fields writes every
 * committed change into it. Because `resolveData` is async, a commit can land
 * carrying the value from a keystroke the user has already typed past, which
 * would overwrite what they're typing and reset the caret. Local state is
 * private, so holding the value here and ignoring the store while the field is
 * focused keeps the edit intact. On blur it re-syncs from the store.
 */
export const useLocalValue = (
  path: string,
  onChange: (value: any, ...rest: any[]) => void,
  { tracked = true, fallback }: UseLocalValueOptions = {}
) => {
  const value = useDeepField(path, tracked);
  const isFocused = useIsFocused(path);

  const [localValue, setLocalValue] = useState(value);

  const onChangeLocal = useCallback(
    (val: any, ...rest: any[]) => {
      setLocalValue(val);

      onChange(val, ...rest);
    },
    [onChange]
  );

  useEffect(() => {
    // Nothing is tracked, so there is no local state to keep in sync.
    if (!tracked) {
      return;
    }

    // Prevent global state from setting local state if this field is focused
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [tracked, isFocused, value]);

  if (!tracked) {
    return [undefined, onChange] as const;
  }

  return [
    typeof fallback !== "undefined" && localValue == null
      ? fallback
      : localValue,
    onChangeLocal,
  ] as const;
};
