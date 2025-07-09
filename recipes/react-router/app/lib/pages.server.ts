import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import type { Data } from "@measured/puck";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, "..", "..", "database.json");

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
