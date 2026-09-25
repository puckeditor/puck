import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { ProjectContext } from "../detect/project";
import type { ProjectState } from "../detect/state";
import type { TemplateSource } from "../templates/source";
import type { CapabilityId, RequiredAction, Warning } from "../result";
import type { PlanStep } from "./types";
import { toPosix } from "../detect/scan";
import { addCommand } from "./install";
import { addDependencies } from "../templates/transform";
import { lineOf } from "../ast/splice";

const normalizeEol = (text: string) => text.replace(/\r\n/g, "\n");

export type CreateOutcome = "created" | "identical" | "skipped" | "conflict";

/**
 * Accumulates the plan for one run. Framework adapters and capabilities call
 * these helpers; content goes into the Vfs overlay and only a description of
 * each change is recorded as a step.
 */
export class Planner {
  steps: PlanStep[] = [];
  actions: RequiredAction[] = [];
  warnings: Warning[] = [];
  #dependencies: { name: string; range: string; capability: CapabilityId }[] =
    [];
  /** Set when the app itself is being scaffolded in this run */
  scaffolded = false;
  /** Puck Cloud API host for puckHandler, when not the default */
  cloudHost?: string;

  constructor(
    public vfs: Vfs,
    public ctx: ProjectContext,
    public state: ProjectState,
    public templates: TemplateSource,
    public cliVersion: string
  ) {}

  abs(rel: string) {
    return path.join(this.ctx.root, rel);
  }

  rel(abs: string) {
    return toPosix(path.relative(this.ctx.root, abs));
  }

  createFile(
    rel: string,
    content: Buffer | string,
    opts: {
      capability: CapabilityId | "bootstrap";
      summary?: string;
      ifMissing?: boolean;
      silent?: boolean;
    }
  ): CreateOutcome {
    const abs = this.abs(rel);
    const existing = this.vfs.readBuffer(abs);

    if (existing) {
      const same =
        typeof content === "string"
          ? normalizeEol(existing.toString("utf8")) === normalizeEol(content)
          : existing.equals(content);
      if (same) return "identical";
      return opts.ifMissing ? "skipped" : "conflict";
    }

    this.vfs.write(abs, content);
    if (!opts.silent) {
      this.steps.push({
        id: `${opts.capability}:create:${rel}`,
        kind: "create_file",
        capability: opts.capability,
        summary: opts.summary ?? `Create ${rel}`,
        path: abs,
      });
    }
    return "created";
  }

  modifyFile(
    rel: string,
    content: string,
    opts: {
      capability: CapabilityId;
      summary: string;
      inserted?: { at: number; text: string }[];
    }
  ) {
    const abs = this.abs(rel);
    this.vfs.write(abs, content);

    const id = `${opts.capability}:modify:${rel}`;
    const edits = (opts.inserted ?? []).map((e) => ({
      line: lineOf(content, e.at),
      insert: e.text,
    }));
    const existing = this.steps.find((s) => s.id === id);
    if (existing && existing.kind === "modify_file") {
      existing.edits.push(...edits);
      return;
    }
    this.steps.push({
      id,
      kind: "modify_file",
      capability: opts.capability,
      summary: opts.summary,
      path: abs,
      edits,
    });
  }

  manual(action: RequiredAction) {
    if (!this.actions.some((a) => a.id === action.id))
      this.actions.push(action);
  }

  warn(code: string, message: string) {
    if (!this.warnings.some((w) => w.code === code))
      this.warnings.push({ code, message });
  }

  addDependency(name: string, range: string, capability: CapabilityId) {
    if (!this.#dependencies.some((d) => d.name === name)) {
      this.#dependencies.push({ name, range, capability });
    }
  }

  /** Turns collected dependencies into one install, or folds them into a scaffolded package.json */
  finalize() {
    if (this.#dependencies.length === 0) return;

    if (this.scaffolded) {
      const pkgPath = this.abs("package.json");
      const text = this.vfs.readText(pkgPath);
      if (text)
        this.vfs.write(pkgPath, addDependencies(text, this.#dependencies));
      return;
    }

    const specs = this.#dependencies.map((d) => `${d.name}@${d.range}`);
    this.steps.unshift({
      id: `install:${this.#dependencies.map((d) => d.name).join(",")}`,
      kind: "install_package",
      capability: this.#dependencies[0].capability,
      summary: `Install ${specs.join(", ")}`,
      packages: this.#dependencies.map(({ name, range }) => ({ name, range })),
      run: addCommand(this.ctx, specs),
    });
  }
}
