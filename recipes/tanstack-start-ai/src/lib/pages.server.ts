import path from "node:path";
import fs from "node:fs/promises";
import type { Data } from "@puckeditor/core";

const databasePath = path.join(process.cwd(), "database.json");

export async function getPage(path: string) {
  const pages = await readDatabase();
  return pages[path];
}

export async function savePage(path: string, data: Data) {
  const pages = await readDatabase();
  pages[path] = data;
  await fs.writeFile(databasePath, JSON.stringify(pages), { encoding: "utf8" });
}

async function readDatabase() {
  try {
    const file = await fs.readFile(databasePath, "utf8");
    return JSON.parse(file) as Record<string, Data>;
  } catch (error: unknown) {
    console.error(error);
    return {};
  }
}
