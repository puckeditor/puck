import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export interface PendingWrite {
  path: string;
  content: Buffer;
  /** File mode for new files, e.g. 0o600 for env files */
  mode?: number;
  existed: boolean;
  beforeHash: string | null;
}

export const hashContent = (content: Buffer | string) =>
  createHash("sha256").update(content).digest("hex");

const readDisk = (p: string): Buffer | null => {
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
};

/**
 * A copy-on-write view of the file system. Planning writes into the overlay so
 * later steps (and re-detection after scaffolding) see planned changes, while
 * nothing touches the disk until the applier flushes it.
 */
export class Vfs {
  #overlay = new Map<string, PendingWrite>();

  readBuffer(p: string): Buffer | null {
    const pending = this.#overlay.get(p);
    if (pending) return pending.content;
    return readDisk(p);
  }

  readText(p: string): string | null {
    const buf = this.readBuffer(p);
    return buf ? buf.toString("utf8") : null;
  }

  exists(p: string): boolean {
    if (this.#overlay.has(p)) return true;
    if (fs.existsSync(p)) return true;
    return this.#overlayHasDescendant(p);
  }

  isFile(p: string): boolean {
    if (this.#overlay.has(p)) return true;
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  }

  isDir(p: string): boolean {
    try {
      if (fs.statSync(p).isDirectory()) return true;
    } catch {
      // fall through to the overlay
    }
    return this.#overlayHasDescendant(p);
  }

  /** Lists direct children of a directory, merging disk and overlay entries */
  list(dir: string): { name: string; isDir: boolean }[] {
    const entries = new Map<string, boolean>();

    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        entries.set(entry.name, entry.isDirectory());
      }
    } catch {
      // directory may only exist in the overlay
    }

    const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
    for (const p of this.#overlay.keys()) {
      if (!p.startsWith(prefix)) continue;
      const [first, ...rest] = p.slice(prefix.length).split(path.sep);
      entries.set(first, rest.length > 0 || entries.get(first) === true);
    }

    return [...entries.entries()]
      .map(([name, isDir]) => ({ name, isDir }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  write(p: string, content: Buffer | string, opts: { mode?: number } = {}) {
    const existing = this.#overlay.get(p);
    const buf =
      typeof content === "string" ? Buffer.from(content, "utf8") : content;

    if (existing) {
      existing.content = buf;
      if (opts.mode !== undefined) existing.mode = opts.mode;
      return;
    }

    const disk = readDisk(p);
    this.#overlay.set(p, {
      path: p,
      content: buf,
      mode: opts.mode,
      existed: disk !== null,
      beforeHash: disk ? hashContent(disk) : null,
    });
  }

  isPending(p: string) {
    return this.#overlay.has(p);
  }

  pending(): PendingWrite[] {
    return [...this.#overlay.values()].sort((a, b) =>
      a.path.localeCompare(b.path)
    );
  }

  #overlayHasDescendant(p: string) {
    const prefix = p.endsWith(path.sep) ? p : p + path.sep;
    for (const key of this.#overlay.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }
}
