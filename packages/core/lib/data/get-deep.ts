export const getDeep = (node: Record<string, any>, path: string): any => {
  const pathParts = path.split(".");

  return pathParts.reduce((acc, item) => {
    if (!acc) return;

    const [prop, indexStr] = item.replace("]", "").split("[");

    const val = acc[prop];

    if (indexStr && val) {
      return val[parseInt(indexStr)];
    }

    return val;
  }, node);
};
