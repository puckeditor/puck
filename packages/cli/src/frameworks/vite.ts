import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import { ensureOptimizeDepsInclude } from "../ast/vite-optimize-deps";

/**
 * Pre-bundles Puck so Vite doesn't discover it on the first request and
 * re-bundle mid-load. React Router is left with two copies of react-router,
 * and TanStack Start reloads the page mid-hydration.
 */
export const planOptimizeDeps = (
  p: Planner,
  info: { viteConfig: string | null },
  pkgs: string[],
  capability: CapabilityId
) => {
  const file = info.viteConfig ?? "vite.config.ts";
  const manual = (detail: string) =>
    p.manual({
      id: `${capability}:vite-optimize-deps`,
      type: "manual_edit",
      capability,
      required: false,
      file,
      reason: "unsupported_shape",
      message: `Couldn't add Puck to optimizeDeps.include automatically: ${detail}.`,
      instructions: `Add ${pkgs.join(
        " and "
      )} to optimizeDeps.include in ${file}, or the first page load after starting the dev server may crash while Vite re-bundles dependencies.`,
      snippet: `optimizeDeps: {\n  include: [${pkgs
        .map((pkg) => `"${pkg}"`)
        .join(", ")}],\n},`,
    });

  if (!info.viteConfig) return manual("no vite.config file was found");

  const code = p.vfs.readText(p.abs(info.viteConfig)) ?? "";
  const result = ensureOptimizeDepsInclude(code, info.viteConfig, pkgs);

  if (result.status === "exists") return;
  if (result.status === "manual")
    return manual(result.detail.replace(/\.$/, ""));

  p.modifyFile(info.viteConfig, result.code, {
    capability,
    summary: `Pre-bundle Puck in ${info.viteConfig}`,
    inserted: [{ at: result.at, text: result.text }],
  });
};
