import type { VinextInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { FrameworkAdapter } from "./adapter";
import { ensureSsrExternal } from "../ast/vite-optimize-deps";
import {
  NEXT_AI_EDITOR_EXCLUDED,
  NEXT_AI_EDITOR_MAPPED,
  NEXT_EDITOR_EXCLUDED,
  NEXT_EDITOR_MAPPED,
  nextAdapter,
} from "./next";

// vinext recipes share Next's app files; only the build setup differs
const toVinext = (excluded: string[]) =>
  [
    ...excluded.filter(
      (f) => f !== "next.config.js" && !f.startsWith("tsconfig/")
    ),
    "vite.config.ts",
  ].sort();

export const VINEXT_EDITOR_EXCLUDED = toVinext(NEXT_EDITOR_EXCLUDED);
export const VINEXT_EDITOR_MAPPED = NEXT_EDITOR_MAPPED;
export const VINEXT_AI_EDITOR_EXCLUDED = toVinext(NEXT_AI_EDITOR_EXCLUDED);
export const VINEXT_AI_EDITOR_MAPPED = NEXT_AI_EDITOR_MAPPED;

/**
 * The AI SDK depends on @vercel/oidc, whose CommonJS modules require each
 * other in a cycle that Vite's module runner can't evaluate. Rendering the
 * editor then fails with "reading '__cjs_module_runner_transform'", so Node
 * has to load it instead.
 */
const SSR_EXTERNAL = ["@vercel/oidc"];

const planSsrExternal = (p: Planner, info: VinextInfo) => {
  const file = info.viteConfig ?? "vite.config.ts";
  const manual = (detail: string) =>
    p.manual({
      id: "ai:vite-ssr-external",
      type: "manual_edit",
      capability: "ai",
      required: true,
      file,
      reason: "unsupported_shape",
      message: `Couldn't add @vercel/oidc to ssr.external automatically: ${detail}.`,
      instructions: `Add @vercel/oidc to ssr.external in ${file}, or vinext fails to render the Puck AI editor.`,
      snippet: `ssr: {\n  external: ["@vercel/oidc"],\n},`,
    });

  if (!info.viteConfig) return manual("no vite.config file was found");

  const code = p.vfs.readText(p.abs(info.viteConfig)) ?? "";
  const result = ensureSsrExternal(code, info.viteConfig, SSR_EXTERNAL);

  if (result.status === "exists") return;
  if (result.status === "manual")
    return manual(result.detail.replace(/\.$/, ""));

  p.modifyFile(info.viteConfig, result.code, {
    capability: "ai",
    summary: `Load @vercel/oidc with Node in ${info.viteConfig}`,
    inserted: [{ at: result.at, text: result.text }],
  });
};

export const vinextAdapter: FrameworkAdapter<VinextInfo> = {
  ...nextAdapter,
  recipe: (withAi) => (withAi ? "vinext-ai" : "vinext"),
  planEditor: (p, info, withAi) => {
    nextAdapter.planEditor(p, info, withAi);
    if (withAi) planSsrExternal(p, info);
  },
  planAi: (p, info) => {
    nextAdapter.planAi(p, info);
    planSsrExternal(p, info);
  },
  deployEnvWarning:
    "vinext start loads .env files, but Cloudflare Workers don't. Set PUCK_API_KEY with `wrangler secret put PUCK_API_KEY` when deploying to Workers.",
};
