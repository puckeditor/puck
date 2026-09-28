import type { Data } from "@puckeditor/core";

// Loads and saves pages with the pages API in server/puck/pages.ts
export const loadPage = async (path: string): Promise<Data | null> => {
  const response = await fetch(`/api/pages?path=${encodeURIComponent(path)}`);
  return response.ok ? response.json() : null;
};

export const savePage = async (path: string, data: Data) => {
  await fetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, data }),
  });
};
