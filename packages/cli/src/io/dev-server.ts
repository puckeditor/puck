import { spawn } from "node:child_process";
import type { CommandSpec } from "../plan/types";

const ANSI = /\u001b\[[0-9;]*m/g;
const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+/;

export type RunDevServer = (
  spec: CommandSpec,
  onReady: (url: string) => void
) => Promise<number>;

/**
 * Runs the app's dev server in the foreground, streaming its output, and
 * calls `onReady` with the first local URL it prints (e.g. Next.js picks
 * another port when 3000 is taken).
 */
export const runDevServer: RunDevServer = (spec, onReady) =>
  new Promise((resolve) => {
    let ready = false;
    let buffer = "";

    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    const watch = (chunk: Buffer, out: NodeJS.WriteStream) => {
      out.write(chunk);
      if (ready) return;
      buffer = (buffer + chunk.toString("utf8").replace(ANSI, "")).slice(-4096);
      const match = LOCAL_URL.exec(buffer);
      if (match) {
        ready = true;
        onReady(match[0]);
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => watch(chunk, process.stdout));
    child.stderr?.on("data", (chunk: Buffer) => watch(chunk, process.stderr));

    // Ctrl+C reaches the dev server too; wait for it to exit cleanly
    const ignore = () => undefined;
    process.on("SIGINT", ignore);
    const done = (code: number) => {
      process.off("SIGINT", ignore);
      resolve(code);
    };
    child.on("error", () => done(1));
    child.on("close", (code) => done(code ?? 0));
  });
