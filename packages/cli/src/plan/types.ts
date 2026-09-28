import type { CapabilityId } from "../result";
import type { FrameworkId } from "../detect/framework";

interface StepBase {
  id: string;
  capability: CapabilityId | "bootstrap";
  summary: string;
}

export interface CommandSpec {
  command: string;
  args: string[];
  cwd: string;
}

export type PlanStep =
  | (StepBase & {
      kind: "scaffold_app";
      framework: FrameworkId;
      dir: string;
      files: number;
    })
  | (StepBase & {
      kind: "install_package";
      packages: { name: string; range: string }[];
      run: CommandSpec;
    })
  | (StepBase & { kind: "install_dependencies"; run: CommandSpec })
  /** A framework's own setup command, run after installs and before writes */
  | (StepBase & { kind: "run_command"; run: CommandSpec })
  | (StepBase & { kind: "create_file"; path: string })
  | (StepBase & {
      kind: "modify_file";
      path: string;
      edits: { line: number; insert: string }[];
    })
  | (StepBase & {
      kind: "write_env";
      path: string;
      key: string;
      operation: "add" | "update";
    })
  | (StepBase & { kind: "update_gitignore"; path: string; add: string[] });
