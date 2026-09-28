import path from "node:path";
import type { Vfs } from "../io/vfs";
import { readPackageJson } from "./package-json";

const ENTRY_CANDIDATES = ["src", ""].flatMap((dir) =>
  ["index", "app", "server", "main"].flatMap((name) =>
    ["ts", "mts"].map((ext) => (dir ? `${dir}/` : "") + `${name}.${ext}`)
  )
);

const SCRIPT_ENTRY = /(?:^|\s)(?:\.\/)?([\w./-]+\.m?ts)(?=\s|$)/;

/**
 * The server's entry module: the file its dev or start script runs, or the
 * usual locations when the scripts don't name one
 */
export const findServerEntry = (vfs: Vfs, root: string) => {
  const read = readPackageJson(vfs, root);
  const scripts = read.status === "ok" ? read.pkg.scripts ?? {} : {};

  for (const script of [scripts.dev, scripts.start]) {
    const match = script?.match(SCRIPT_ENTRY);
    if (match && vfs.exists(path.join(root, match[1]))) return match[1];
  }
  return ENTRY_CANDIDATES.find((c) => vfs.exists(path.join(root, c))) ?? null;
};

/** Strips comments and trailing commas so tsconfig.json can be parsed */
const parseJsonc = (text: string) => {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      const end = text.indexOf('"', i + 1);
      let j = end;
      while (j !== -1 && text[j - 1] === "\\") j = text.indexOf('"', j + 1);
      out += text.slice(i, j + 1);
      i = j === -1 ? text.length : j;
    } else if (ch === "/" && text[i + 1] === "/") {
      i = text.indexOf("\n", i) - 1;
      if (i < 0) break;
    } else if (ch === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
      if (i <= 0) break;
    } else out += ch;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
};

/**
 * Node's ESM resolution (module: node16/nodenext) needs file extensions in
 * relative imports, which are written as `.js` for `.ts` files
 */
export const relativeImportExtension = (vfs: Vfs, root: string) => {
  const text = vfs.readText(path.join(root, "tsconfig.json"));
  if (!text) return "";
  try {
    const options = parseJsonc(text).compilerOptions ?? {};
    const modes = [options.module, options.moduleResolution].map((m) =>
      String(m ?? "").toLowerCase()
    );
    return modes.some((m) => m === "node16" || m === "nodenext") ? ".js" : "";
  } catch {
    return "";
  }
};

export type ServerRuntime = "node" | "bun" | "workers" | "deno" | "other";

export const detectRuntime = (
  vfs: Vfs,
  root: string,
  deps: Record<string, string>
): ServerRuntime => {
  if (
    "wrangler" in deps ||
    ["wrangler.toml", "wrangler.json", "wrangler.jsonc"].some((f) =>
      vfs.exists(path.join(root, f))
    )
  )
    return "workers";
  const read = readPackageJson(vfs, root);
  const dev = read.status === "ok" ? read.pkg.scripts?.dev ?? "" : "";
  if (/(^|\s)bun\s/.test(dev)) return "bun";
  if (/(^|\s)deno\s/.test(dev) || vfs.exists(path.join(root, "deno.json")))
    return "deno";
  if ("@hono/node-server" in deps || /(^|\s)(tsx|node|ts-node)\s/.test(dev))
    return "node";
  return "other";
};
