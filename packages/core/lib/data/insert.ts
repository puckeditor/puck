export const insert = (list: any[], index: number, item: any) => {
  const result = Array.from(list || []);
  result.splice(index, 0, item);

  return result;
};
