import { spawn } from "node:child_process";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface CommandRunner {
  run(
    command: string,
    args: string[],
    opts: { cwd: string }
  ): Promise<RunResult>;
}

const MAX_CAPTURE = 64 * 1024;

// cmd.exe treats these specially outside double quotes; `^` is its escape character
const CMD_SPECIAL = /[\s^&|<>()]/;

/**
 * Quote arguments that cmd.exe would otherwise rewrite. With `shell: true`,
 * Node joins the arguments into one cmd.exe command line, which drops the `^`
 * from `react@^19.0.0` and installs an exact version instead of a range.
 * Elsewhere there's no shell, so the arguments pass through unchanged.
 */
export const quoteForShell = (args: string[], platform: string) =>
  platform === "win32"
    ? args.map((arg) =>
        CMD_SPECIAL.test(arg) && !arg.includes('"') ? `"${arg}"` : arg
      )
    : args;

const append = (current: string, chunk: Buffer) => {
  const next = current + chunk.toString("utf8");
  return next.length > MAX_CAPTURE ? next.slice(-MAX_CAPTURE) : next;
};

export const createRunner = (
  baseEnv: Record<string, string | undefined>
): CommandRunner => ({
  run(command, args, { cwd }) {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";

      const child = spawn(command, quoteForShell(args, process.platform), {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        // Package managers ship as .cmd shims on Windows
        shell: process.platform === "win32",
        env: { ...baseEnv, NO_COLOR: "1", FORCE_COLOR: "0" },
      });

      child.stdout?.on(
        "data",
        (chunk: Buffer) => (stdout = append(stdout, chunk))
      );
      child.stderr?.on(
        "data",
        (chunk: Buffer) => (stderr = append(stderr, chunk))
      );

      child.on("error", (err) =>
        resolve({ code: 127, stdout, stderr: stderr + String(err.message) })
      );
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
  },
});
