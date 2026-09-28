import { createServerFn } from "@tanstack/react-start";
import { Data } from "@puckeditor/core";
import fs from "fs/promises";

const DB_PATH = "database.json";

function validatePath(path: string): string {
  if (typeof path !== "string") {
    throw new Error("Invalid page path: expected a string");
  }
  return path;
}

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
  .validator(validatePath)
  .handler(async ({ data: path }) => {
    const allData = await readDatabase();
    return Object.hasOwn(allData, path) ? allData[path] : null;
  });

export const savePageServerFn = createServerFn({
  method: "POST",
})
  .validator((input: { data: Data; path: string }) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid publish input: expected an object");
    }
    validatePath(input.path);
    if (
      !input.data ||
      typeof input.data !== "object" ||
      Array.isArray(input.data) ||
      !Array.isArray(input.data.content) ||
      !input.data.root ||
      typeof input.data.root !== "object" ||
      Array.isArray(input.data.root)
    ) {
      throw new Error("Invalid page data: expected content and root");
    }
    return input;
  })
  .handler(async ({ data: { data, path } }) => {
    const allData = await readDatabase();
    const newAllData = {
      ...allData,
      [path]: data,
    };
    await fs.writeFile(DB_PATH, JSON.stringify(newAllData));
    return { status: "ok" };
  });
