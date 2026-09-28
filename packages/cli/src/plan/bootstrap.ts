import path from "node:path";
import type { Vfs } from "../io/vfs";
import type { RecipeName, TemplateSource } from "../templates/source";
import {
  transformPackageJson,
  transformTsconfig,
} from "../templates/transform";
import { withCloudHost } from "../templates/cloud";
import { ADAPTERS } from "../frameworks";

const CLOUD_ROUTES: string[] = Object.values(ADAPTERS).map(
  (a) => a.recipeCloudRoute
);

export const APP_NAME = /^[a-z0-9][a-z0-9._-]*$/;

export const sanitizeAppName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/-+$/, "") || "my-puck-app";

/** Writes a recipe into the overlay as a standalone app */
export const scaffoldApp = (
  vfs: Vfs,
  templates: TemplateSource,
  {
    recipe,
    dir,
    appName,
    cliVersion,
    cloudHost,
  }: {
    recipe: RecipeName;
    dir: string;
    appName: string;
    cliVersion: string;
    cloudHost?: string;
  }
) => {
  const files = templates.list(recipe);

  for (const rel of files) {
    const target = path.join(dir, ...rel.split("/"));
    const raw = templates.read(recipe, rel);

    if (rel === "package.json") {
      vfs.write(
        target,
        transformPackageJson(raw.toString("utf8"), { appName, cliVersion })
      );
    } else if (rel === "tsconfig.json") {
      vfs.write(target, transformTsconfig(raw.toString("utf8")));
    } else if (CLOUD_ROUTES.includes(rel)) {
      vfs.write(target, withCloudHost(raw.toString("utf8"), cloudHost));
    } else {
      vfs.write(target, raw);
    }
  }

  return { files: files.length };
};
