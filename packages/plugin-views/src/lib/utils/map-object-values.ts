/**
 * Maps all object values applying the provided transform function, returning a new object with the transformed values.
 *
 * @param obj The object whose values should be transformed
 * @param transformValue The function to apply to each value in the object
 * @returns A new object with the same keys as the input object but with transformed values
 */
const mapObjectValues = <
  T extends object,
  TValue = T[keyof T],
  TResult = TValue
>(
  obj: T,
  transformValue: (value: TValue) => TResult
): { [K in keyof T]: TResult } => {
  const newFields = {} as { [K in keyof T]: TResult };

  Object.entries(obj).forEach(([key, field]) => {
    newFields[key as keyof T] = transformValue(field as TValue);
  });

  return newFields;
};

export default mapObjectValues;
