import fs from "node:fs/promises";
import type { Data } from "@puckeditor/core";

// Replace this with your own database
const databasePath = "database.json";

const readPages = async (): Promise<Record<string, Data>> => {
  try {
    return JSON.parse(await fs.readFile(databasePath, "utf-8"));
  } catch {
    return {};
  }
};

export const getPage = async (path: string) => (await readPages())[path];

export const savePage = async (path: string, data: Data) => {
  const pages = await readPages();
  pages[path] = data;
  await fs.writeFile(databasePath, JSON.stringify(pages));
};
