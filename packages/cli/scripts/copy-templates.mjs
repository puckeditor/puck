// Copies the Puck recipes into dist/templates so the published CLI can
// scaffold and integrate them without the monorepo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipesDir = path.join(pkgDir, "..", "..", "recipes");
const outDir = path.join(pkgDir, "dist", "templates");
const config = JSON.parse(
  fs.readFileSync(path.join(pkgDir, "templates.json"), "utf8")
);

const toRegex = (glob) =>
  new RegExp(
    "^" +
      glob
        .split("*")
        .map((part) => part.replace(/[.+^${}()|[\]\\?]/g, "\\$&"))
        .join("[^/]*") +
      "$"
  );

const excluded = (rel) =>
  config.exclude.some((pattern) => {
    const parts = rel.split("/");
    if (pattern.endsWith("/**")) {
      const regex = toRegex(pattern.slice(0, -3));
      return parts.slice(0, -1).some((part) => regex.test(part));
    }
    const regex = toRegex(pattern);
    return pattern.includes("/")
      ? regex.test(rel)
      : regex.test(parts[parts.length - 1]);
  });

const copyDir = (from, to, base = from) => {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const rel = path.relative(base, src).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (!excluded(`${rel}/x`)) copyDir(src, to, base);
      continue;
    }
    if (excluded(rel)) continue;
    // npm strips .gitignore from published tarballs
    const target = path.join(
      to,
      rel.replace(/(^|\/)\.gitignore$/, "$1_gitignore")
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
  }
};

fs.rmSync(outDir, { recursive: true, force: true });
for (const recipe of config.recipes) {
  copyDir(path.join(recipesDir, recipe), path.join(outDir, recipe));
}

const aiPkg = JSON.parse(
  fs.readFileSync(path.join(recipesDir, "next-ai", "package.json"), "utf8")
);
const manifest = {
  cloudClientRange: aiPkg.dependencies["@puckeditor/cloud-client"],
  pluginAiRange: aiPkg.dependencies["@puckeditor/plugin-ai"],
  // No recipe uses Puck Pages or Puck Auth yet
  cloudClientPagesRange: config.ranges.cloudClientPages,
  pluginPagesRange: config.ranges.pluginPages,
  pluginAuthRange: config.ranges.pluginAuth,
};
fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);

console.log(`Copied ${config.recipes.join(", ")} templates to dist/templates`);
