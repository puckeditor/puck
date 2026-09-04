import type { PageStore, StoredPage } from "@puckeditor/router";

import { UserData } from "../config/types";

/**
 * Local storage as the demo's database.
 *
 * The real point of this file is that a `PageStore` doesn't have to be a server
 * or a filesystem — the interface is three async methods, so the demo's
 * browser-only storage satisfies it as-is.
 */
export const createLocalPageStore = (
  namespace: string
): PageStore<UserData> => {
  const prefix = `puck-demo:${namespace}:`;
  const isBrowser = typeof window !== "undefined";

  return {
    async get(path) {
      if (!isBrowser) return null;

      const raw = localStorage.getItem(prefix + path);

      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw);

        // Rows written before this store existed hold bare `Data` rather than a
        // `StoredPage`. They have no fork hash, so they report no drift.
        if (parsed && !("data" in parsed)) {
          return { data: parsed as UserData };
        }

        return parsed as StoredPage<UserData>;
      } catch {
        return null;
      }
    },

    async set(path, page) {
      if (!isBrowser) return;

      localStorage.setItem(prefix + path, JSON.stringify(page));
    },

    async list() {
      if (!isBrowser) return [];

      const paths: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.indexOf(prefix) === 0) {
          paths.push(key.slice(prefix.length));
        }
      }

      return paths;
    },
  };
};
