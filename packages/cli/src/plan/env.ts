import path from "node:path";
import type { Planner } from "./planner";
import type { Secret } from "../secret";
import { ENV_KEY } from "../constants";
import { upsertEnv } from "../env/dotenv";
import { isLocalEnvFile, isSharedEnvFile } from "../env/files";
import { isIgnored, planIgnore } from "../env/gitignore";

const gitignoreRoot = (p: Planner) =>
  p.ctx.gitRoot ?? p.ctx.workspace?.root ?? p.ctx.root;

/** Makes sure git ignores the env file holding the key */
export const planGitignore = (p: Planner, envFile: string) => {
  if (isIgnored(p.vfs, envFile, gitignoreRoot(p))) return;

  const { gitignore, content } = planIgnore(
    p.vfs,
    envFile,
    p.ctx.root,
    p.ctx.gitRoot
  );
  const pattern = path
    .relative(path.dirname(gitignore), envFile)
    .split(path.sep)
    .join("/");
  p.vfs.write(gitignore, content);
  p.steps.push({
    id: `cloud:gitignore:${p.rel(gitignore)}`,
    kind: "update_gitignore",
    capability: "cloud",
    summary: `Add ${pattern} to ${p.rel(gitignore) || ".gitignore"}`,
    path: gitignore,
    add: [pattern],
  });
};

/**
 * Writes the key where the framework will actually read it: in place if the
 * effective key already lives in an ignored *.local file, otherwise
 * .env.local. Never writes secrets into .env / .env.development, which are
 * commonly committed.
 */
export const planEnvWrite = (p: Planner, secret: Secret) => {
  const location = p.state.cloud.apiKey;
  const envDir = p.state.cloud.envDir;
  const root = gitignoreRoot(p);

  const target =
    location.file &&
    isLocalEnvFile(location.source) &&
    isIgnored(p.vfs, location.file, root)
      ? location.file
      : path.join(envDir, ".env.local");

  if (isSharedEnvFile(location.source)) {
    p.warn(
      "PUCK-CLI-W-KEY-IN-SHARED-ENV",
      `${location.source} also contains ${ENV_KEY}. .env.local takes precedence, but files like ${location.source} are often committed, so consider removing it.`
    );
  }

  const existing = p.vfs.readText(target);
  const { content, operation } = upsertEnv(existing, ENV_KEY, secret.reveal());

  if (operation !== "noop") {
    p.vfs.write(target, content, { mode: 0o600 });
    p.steps.push({
      id: `cloud:env:${p.rel(target)}`,
      kind: "write_env",
      capability: "cloud",
      summary: `${operation === "add" ? "Add" : "Update"} ${ENV_KEY} in ${p.rel(
        target
      )}`,
      path: target,
      key: ENV_KEY,
      operation,
    });
  }

  planGitignore(p, target);
};
