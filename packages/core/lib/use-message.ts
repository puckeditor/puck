import { useAppStore } from "../store";
import { DictionaryKey, getMessage } from "./dictionary";

/**
 * Read a localized UI message from the store, reacting to changes in the
 * `dictionary` prop.
 *
 * This is the only way components should read a message. It returns the
 * override from the `dictionary` prop if provided, otherwise the built-in
 * default. Pass `params` to fill `{placeholder}` tokens, e.g.
 * `useMessage("viewport-switch", { label })`.
 */
export const useMessage = (
  key: DictionaryKey,
  params?: Record<string, string | number>
) => useAppStore((s) => getMessage(s.dictionary, key, params));
