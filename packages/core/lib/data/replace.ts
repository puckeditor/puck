export const replace = <T>(list: T[], index: number, newItem: T) => {
  const result = Array.from(list);
  result.splice(index, 1);
  result.splice(index, 0, newItem);

  return result;
};
