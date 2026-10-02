/** Whether a boolean-ish environment variable is set, e.g. CI=1 or DO_NOT_TRACK=true */
export const isTruthyEnv = (value: string | undefined) =>
  value !== undefined &&
  value !== "" &&
  value !== "0" &&
  value.toLowerCase() !== "false";
