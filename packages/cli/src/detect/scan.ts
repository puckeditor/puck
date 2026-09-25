import path from "node:path";
import type { Vfs } from "../io/vfs";
import {
  CLOUD_CLIENT_PACKAGE,
  CORE_PACKAGE,
  PLUGIN_AI_PACKAGE,
} from "../constants";
import { tryParseModule } from "../ast/parse";
import { getModuleReferences } from "../ast/imports";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".react-router",
  ".turbo",
  ".vercel",
  ".cache",
  "build",
  "dist",
  "out",
  "coverage",
  "public",
]);

const SOURCE_EXT = /\.(tsx?|jsx?|mjs|cjs|mts|cts)$/;
const MAX_FILES = 4000;
const MAX_DEPTH = 10;
const MAX_BYTES = 512 * 1024;

export interface SourceScan {
  /** Project-relative POSIX paths */
  editorFiles: string[];
  renderFiles: string[];
  cloudHandlerFiles: string[];
  /** Files that create the Puck AI plugin */
  aiPluginFiles: string[];
  cssImported: boolean;
  truncated: boolean;
}

export const toPosix = (p: string) => p.split(path.sep).join("/");

export const listSourceFiles = (vfs: Vfs, root: string) => {
  const files: string[] = [];
  let truncated = false;

  const visit = (dir: string, depth: number) => {
    if (depth > MAX_DEPTH || truncated) return;
    for (const entry of vfs.list(dir)) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDir) {
        // Nested packages (e.g. a monorepo root) are scanned separately
        if (SKIP_DIRS.has(entry.name)) continue;
        if (
          entry.name.startsWith(".") &&
          entry.name !== ".server" &&
          entry.name !== ".client"
        )
          continue;
        if (depth > 0 && vfs.exists(path.join(full, "package.json"))) continue;
        visit(full, depth + 1);
      } else if (SOURCE_EXT.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push(full);
      }
    }
  };

  visit(root, 0);
  return { files, truncated };
};

export const scanSources = (vfs: Vfs, root: string): SourceScan => {
  const scan: SourceScan = {
    editorFiles: [],
    renderFiles: [],
    cloudHandlerFiles: [],
    aiPluginFiles: [],
    cssImported: false,
    truncated: false,
  };

  const { files, truncated } = listSourceFiles(vfs, root);
  scan.truncated = truncated;

  for (const file of files) {
    const buf = vfs.readBuffer(file);
    if (!buf || buf.length > MAX_BYTES) continue;
    const code = buf.toString("utf8");
    // Cheap prefilter before parsing
    if (!code.includes("@puckeditor/")) continue;

    const ast = tryParseModule(code, file);
    if (!ast) continue;

    const rel = toPosix(path.relative(root, file));
    for (const ref of getModuleReferences(ast, code)) {
      if (ref.source === CORE_PACKAGE && ref.kind === "import") {
        const imported = ref.specifiers
          .filter((s) => !s.typeOnly)
          .map((s) => s.imported);
        if (
          imported.includes("Puck") ||
          ref.specifiers.some((s) => s.kind === "namespace")
        ) {
          scan.editorFiles.push(rel);
        }
        if (imported.includes("Render")) scan.renderFiles.push(rel);
      }
      if (ref.source.startsWith(`${CORE_PACKAGE}/puck.css`))
        scan.cssImported = true;
      if (
        ref.source === PLUGIN_AI_PACKAGE &&
        ref.specifiers.some((s) => s.imported === "createAiPlugin")
      ) {
        scan.aiPluginFiles.push(rel);
      }
      if (
        ref.source === CLOUD_CLIENT_PACKAGE &&
        ref.specifiers.some((s) => s.imported === "puckHandler" && !s.typeOnly)
      ) {
        scan.cloudHandlerFiles.push(rel);
      }
    }
  }

  const unique = (list: string[]) => [...new Set(list)].sort();
  scan.editorFiles = unique(scan.editorFiles);
  scan.renderFiles = unique(scan.renderFiles);
  scan.cloudHandlerFiles = unique(scan.cloudHandlerFiles);
  scan.aiPluginFiles = unique(scan.aiPluginFiles);

  return scan;
};
