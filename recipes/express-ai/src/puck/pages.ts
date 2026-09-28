// Loads and saves Puck pages for the editor
// Learn more: https://puckeditor.com/docs/cli
import fs from "node:fs/promises";
import express from "express";

// Replace this with your own database
const databasePath = "database.json";

const readPages = async (): Promise<Record<string, unknown>> => {
  try {
    return JSON.parse(await fs.readFile(databasePath, "utf-8"));
  } catch {
    return {};
  }
};

export const puckPages = express.Router();

puckPages.get("/api/pages", async (req, res) => {
  const pages = await readPages();
  const page = pages[typeof req.query.path === "string" ? req.query.path : "/"];

  if (page) res.json(page);
  else res.status(404).json({ error: "Not found" });
});

puckPages.post(
  "/api/pages",
  express.json({ limit: "10mb" }),
  async (req, res) => {
    const { path, data } = req.body;
    const pages = await readPages();

    pages[path] = data;
    await fs.writeFile(databasePath, JSON.stringify(pages));

    res.json({ status: "ok" });
  }
);
