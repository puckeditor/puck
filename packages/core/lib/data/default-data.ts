import { Data } from "../../types";

export const defaultData = (data: Partial<Data>): Data => ({
  ...data,
  root: data.root || {},
  content: data.content || [],
});
