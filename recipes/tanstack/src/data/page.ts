import { createServerFn } from "@tanstack/react-start";
import { Data } from "@puckeditor/core";
import fs from "fs/promises";

const DB_PATH = "database.json";

export const getPageServerFn = createServerFn({
  method: "GET",
})
  .inputValidator((path: string) => path)
  .handler(async ({ data: path }) => {
    const allData: Record<string, Data> | null = await fs
      .readFile(DB_PATH, "utf-8")
      .then(JSON.parse)
      .catch(() => null);

    return allData ? allData[path] : null;
  });

export const savePageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator((input: { data: Data; path: string }) => input)
  .handler(async ({ data: { data, path } }) => {
    const allData: Record<string, Data> | null = await fs
      .readFile(DB_PATH, "utf-8")
      .then(JSON.parse)
      .catch(() => null);
    const newAllData = {
      ...(allData || {}),
      [path]: data,
    };
    await fs.writeFile(DB_PATH, JSON.stringify(newAllData));
    return { status: "ok" };
  });
