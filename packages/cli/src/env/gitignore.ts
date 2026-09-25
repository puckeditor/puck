import path from "node:path";
import type { Vfs } from "../io/vfs";

export const globToRegex = (glob: string) => {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
        if (glob[i + 1] === "/") i++;
      } else {
        out += "[^/]*";
      }
    } else if (char === "?") {
      out += "[^/]";
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
};

const matchesPattern = (pattern: string, relPath: string) => {
  let p = pattern.trim();
  if (!p || p.startsWith("#")) return false;
  if (p.endsWith("/")) return false; // directory-only patterns never match a file

  const anchored = p.startsWith("/") || p.slice(0, -1).includes("/");
  p = p.replace(/^\//, "");
  const regex = globToRegex(p);

  // Patterns without a slash match the file name at any depth
  return anchored
    ? regex.test(relPath)
    : regex.test(path.posix.basename(relPath));
};

/**
 * Whether git would ignore `file`, evaluating .gitignore files from the git
 * root (or `stopAt`) down to the file's directory. Handles the patterns env
 * files are typically covered by; reads through the Vfs so planned
 * .gitignore edits count.
 */
export const isIgnored = (vfs: Vfs, file: string, rootDir: string) => {
  const dirs: string[] = [];
  for (let dir = path.dirname(file); ; dir = path.dirname(dir)) {
    dirs.unshift(dir);
    if (dir === rootDir || path.dirname(dir) === dir) break;
  }

  let ignored = false;
  for (const dir of dirs) {
    const text = vfs.readText(path.join(dir, ".gitignore"));
    if (text === null) continue;
    const rel = path.relative(dir, file).split(path.sep).join("/");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("!")) {
        if (matchesPattern(line.slice(1), rel)) ignored = false;
      } else if (matchesPattern(line, rel)) {
        ignored = true;
      }
    }
  }
  return ignored;
};

/** Picks the .gitignore to append to and the pattern to add for `file` */
export const planIgnore = (
  vfs: Vfs,
  file: string,
  appRoot: string,
  gitRoot: string | null
): { gitignore: string; content: string } => {
  const appGitignore = path.join(appRoot, ".gitignore");
  const rootGitignore = gitRoot ? path.join(gitRoot, ".gitignore") : null;

  const gitignore = vfs.exists(appGitignore)
    ? appGitignore
    : rootGitignore && vfs.exists(rootGitignore)
    ? rootGitignore
    : appGitignore;

  const pattern = path
    .relative(path.dirname(gitignore), file)
    .split(path.sep)
    .join("/");
  const existing = vfs.readText(gitignore);
  const eol = existing?.includes("\r\n") ? "\r\n" : "\n";
  const block = `# Puck Cloud API key${eol}${pattern}${eol}`;

  const content =
    existing === null || existing === ""
      ? block
      : `${existing}${existing.endsWith("\n") ? "" : eol}${eol}${block}`;

  return { gitignore, content };
};
