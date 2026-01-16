import { getDeep } from "../../../lib/data/get-deep";
import { useFieldStore } from "../store";

export const useDeepField = (path: string) => {
  return useFieldStore((s) => getDeep(s, path));
};
