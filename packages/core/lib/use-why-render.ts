import { useEffect } from "react";

export const useWhyRender = (
  obj: Record<string, any>,
  onRender: (key: string) => void
) => {
  Object.keys(obj).map((key) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      onRender(key);
    }, [obj[key]]);
  });
};
