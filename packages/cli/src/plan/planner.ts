import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { ProjectContext } from "../detect/project";
import type { ProjectState } from "../detect/state";
import type { TemplateSource } from "../templates/source";
import type { CapabilityId, RequiredAction, Warning } from "../result";
import type { CommandSpec, PlanStep } from "./types";
import type { BackendChoice } from "../args";

/** "local" when the app already has its server (e.g. an Astro adapter) */
export interface ResolvedBackend {
  mode: BackendChoice | "local";
  /** For "external": the server's origin */
  url?: string;
}
import { toPosix } from "../detect/scan";
import { addCommand, formatCommand, installCommand } from "./install";
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
  #dependencies: {
    name: string;
    range: string;
    capability: CapabilityId;
    dev?: boolean;
  }[] = [];
  /** Set when the app itself is being scaffolded in this run */
  scaffolded = false;
  /** Where a client-only app gets its server, once resolved */
  backend?: ResolvedBackend;
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

  addDependency(
    name: string,
    range: string,
    capability: CapabilityId,
    opts: { dev?: boolean } = {}
  ) {
    if (!this.#dependencies.some((d) => d.name === name)) {
      this.#dependencies.push({ name, range, capability, dev: opts.dev });
    }
  }

  /** Runs a framework's own setup command, e.g. `astro add react` */
  runCommand(
    run: CommandSpec,
    opts: { capability: CapabilityId; summary: string }
  ) {
    this.steps.push({
      id: `${opts.capability}:run:${[run.command, ...run.args].join(" ")}`,
      kind: "run_command",
      capability: opts.capability,
      summary: opts.summary,
      run,
    });
  }

  /** Turns collected dependencies into one install, or folds them into a scaffolded or edited package.json */
  finalize() {
    if (this.#dependencies.length === 0) return;

    const specs = this.#dependencies.map((d) => `${d.name}@${d.range}`);
    const pkgPath = this.abs("package.json");

    if (this.scaffolded) {
      const text = this.vfs.readText(pkgPath);
      if (text)
        this.vfs.write(pkgPath, addDependencies(text, this.#dependencies));
      return;
    }

    // Installing a package rewrites package.json before the plan's own edit
    // to it is written, so write both at once and run a full install after
    if (this.vfs.isPending(pkgPath)) {
      const text = this.vfs.readText(pkgPath)!;
      this.vfs.write(pkgPath, addDependencies(text, this.#dependencies));
      const run = installCommand(this.ctx);
      this.steps.push({
        id: `install:${this.#dependencies.map((d) => d.name).join(",")}`,
        kind: "install_dependencies",
        capability: this.#dependencies[0].capability,
        summary: `Install ${specs.join(", ")} (${formatCommand(run)})`,
        run,
      });
      return;
    }

    for (const dev of [true, false]) {
      const deps = this.#dependencies.filter((d) => Boolean(d.dev) === dev);
      if (deps.length === 0) continue;
      const depSpecs = deps.map((d) => `${d.name}@${d.range}`);
      this.steps.unshift({
        id: `install:${deps.map((d) => d.name).join(",")}`,
        kind: "install_package",
        capability: deps[0].capability,
        summary: `Install ${depSpecs.join(", ")}${dev ? " (dev)" : ""}`,
        packages: deps.map(({ name, range }) => ({ name, range })),
        run: addCommand(this.ctx, depSpecs, { dev }),
      });
    }
  }
}
