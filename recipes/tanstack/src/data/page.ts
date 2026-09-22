import { createServerFn } from "@tanstack/react-start";
import { Data } from "@puckeditor/core";
import fs from "fs/promises";

const DB_PATH = "database.json";

async function readDatabase(): Promise<Record<string, Data>> {
  let contents: string;
  try {
    contents = await fs.readFile(DB_PATH, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  const pages = JSON.parse(contents);
  if (!pages || typeof pages !== "object" || Array.isArray(pages)) {
    throw new Error("Invalid page database: expected an object keyed by path");
  }
  return pages;
}

export const getPageServerFn = createServerFn({
  method: "GET",
})
  .inputValidator((path: string) => path)
  .handler(async ({ data: path }) => {
    const allData = await readDatabase();
    return allData[path] ?? null;
  });

export const savePageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator((input: { data: Data; path: string }) => input)
  .handler(async ({ data: { data, path } }) => {
    const allData = await readDatabase();
    const newAllData = {
      ...allData,
      [path]: data,
    };
    await fs.writeFile(DB_PATH, JSON.stringify(newAllData));
    return { status: "ok" };
  });
