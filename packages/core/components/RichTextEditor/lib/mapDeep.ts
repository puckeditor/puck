import { ReactNode } from "react";

export const mapDeep = (
  source: any,
  path: string[],
  render: (v: any) => ReactNode
): any => {
  if (!source) {
    return null;
  }

  if (path.length === 0) {
    return render(source);
  }

  const [key, ...rest] = path;

  if (Array.isArray(source)) {
    return source.map((item) => mapDeep(item, path, render));
  }

  return {
    ...source,
    [key]: mapDeep(source![key], rest, render),
  };
};
