// Loads and saves Puck pages for the editor
// Learn more: https://puckeditor.com/docs/cli
import fs from "node:fs/promises";
import { Hono } from "hono";

// Replace this with your own database
const databasePath = "database.json";

const readPages = async (): Promise<Record<string, unknown>> => {
  try {
    return JSON.parse(await fs.readFile(databasePath, "utf-8"));
  } catch {
    return {};
  }
};

export const puckPages = new Hono()
  .get("/api/pages", async (c) => {
    const pages = await readPages();
    const page = pages[c.req.query("path") ?? "/"];

    return page ? c.json(page) : c.json({ error: "Not found" }, 404);
  })
  .post("/api/pages", async (c) => {
    const { path, data } = await c.req.json();
    const pages = await readPages();

    pages[path] = data;
    await fs.writeFile(databasePath, JSON.stringify(pages));

    return c.json({ status: "ok" });
  });
