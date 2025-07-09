export const remove = (list: any[], index: number) => {
  const result = Array.from(list);
  result.splice(index, 1);

  return result;
};
