import path from "node:path";
import type { ExpressInfo, HonoInfo } from "../detect/framework";
import type { Planner } from "../plan/planner";
import type { CapabilityId } from "../result";
import type { Vfs } from "../io/vfs";
import type { FrameworkAdapter } from "./adapter";
import { findCloudRoute } from "./adapter";
import { ensureMounted, isMounted } from "../ast/server-app";
import { templateText } from "../templates/source";
import { withCloudHost, withoutAiOptions } from "../templates/cloud";
import { copyTemplateFiles, planAiRoute } from "./shared";
import { ENV_KEY } from "../constants";

type ServerInfo = HonoInfo | ExpressInfo;

/** Every recipe file must be mapped or deliberately excluded */
export const SERVER_EXCLUDED = [
  ".gitignore",
  "README.md",
  "package.json",
  "src/index.ts",
  "tsconfig.json",
];

export const SERVER_MAPPED = ["database.json", "src/puck/pages.ts"];

export const SERVER_AI_EXCLUDED = SERVER_EXCLUDED;

export const SERVER_AI_MAPPED = [...SERVER_MAPPED, "src/puck/cloud.ts"];

const PAGES = { from: "src/puck/pages.ts", name: "puckPages" };
const CLOUD = { from: "src/puck/cloud.ts", name: "puckCloud" };

/** @puckeditor/cloud-client's build imports react, even on the server */
const CLOUD_CLIENT_PEER = { name: "react", range: "^19.0.0" };

/** Puck's server modules go next to the entry, e.g. src/puck/ */
const puckDir = (vfs: Vfs, root: string, info: ServerInfo) => {
  if (info.entry)
    return path.posix.join(path.posix.dirname(info.entry), "puck");
  return vfs.isDir(path.join(root, "src")) ? "src/puck" : "puck";
};

const importSource = (info: ServerInfo, file: string) => {
  const from = path.posix.dirname(info.entry ?? "index.ts");
  const rel = path.posix.relative(from, file).replace(/\.ts$/, "");
  return `${rel.startsWith(".") ? "" : "./"}${rel}${info.importExtension}`;
};

const mountSnippet = (info: ServerInfo, name: string, file: string) =>
  `import { ${name} } from "${importSource(info, file)}";\n\n${
    info.id === "hono" ? `app.route("/", ${name});` : `app.use(${name});`
  }`;

/** Mounts a Puck router in the entry, or asks for it to be mounted by hand */
const planMount = (
  p: Planner,
  info: ServerInfo,
  name: string,
  file: string,
  capability: CapabilityId
) => {
  const label = info.id === "hono" ? "Hono" : "Express";
  const manual = (detail: string) =>
    p.manual({
      id: `${capability}:mount`,
      type: "manual_edit",
      capability,
      required: true,
      file: info.entry ?? "src/index.ts",
      reason: "unsupported_shape",
      message: `Couldn't mount ${name} automatically: ${detail}.`,
      instructions: `Import ${name} from ${file} and mount it on your ${label} app before it starts serving.`,
      snippet: mountSnippet(info, name, file),
    });

  if (!info.entry) return manual("no entry file was found");

  const code = p.vfs.readText(p.abs(info.entry)) ?? "";
  const result = ensureMounted(code, info.entry, info.id, {
    name,
    source: importSource(info, file),
  });

  if (result.status === "exists") return;
  if (result.status === "manual")
    return manual(result.detail.replace(/\.$/, ""));

  p.modifyFile(info.entry, result.code, {
    capability,
    summary: `Mount ${name} in ${info.entry}`,
    inserted: result.inserted,
  });
};

const DEV_COMMAND = /^(tsx watch|tsx|node --watch|node)(?=\s)/;

/** Node doesn't load .env files, so the dev script has to load .env.local */
const planEnvLoading = (p: Planner, info: ServerInfo) => {
  if (info.runtime === "bun") return;

  if (info.runtime === "workers") {
    p.manual({
      id: "cloud:env-loading",
      type: "manual_edit",
      capability: "cloud",
      required: true,
      file: ".dev.vars",
      reason: "unsupported_shape",
      message: `Wrangler reads local secrets from .dev.vars, not .env.local.`,
      instructions: `Add ${ENV_KEY} to .dev.vars for development, set it with \`wrangler secret put ${ENV_KEY}\` for production, and pass apiKey: c.env.${ENV_KEY} to puckHandler, because Workers don't have process.env by default.`,
      snippet: `${ENV_KEY}=your-api-key`,
    });
    return;
  }

  const text = p.vfs.readText(p.abs("package.json")) ?? "{}";
  const pkg = JSON.parse(text);
  const dev: string | undefined = pkg.scripts?.dev;
  if (dev && /--env-file|dotenv/.test(dev)) return;

  const match = dev?.match(DEV_COMMAND);
  if (!dev || !match) {
    p.manual({
      id: "cloud:env-loading",
      type: "manual_edit",
      capability: "cloud",
      required: true,
      file: "package.json",
      reason: "unsupported_shape",
      message: `Node doesn't load .env.local, so ${ENV_KEY} won't reach puckHandler.`,
      instructions: `Load .env.local when the server starts in development, e.g. with Node's --env-file-if-exists=.env.local flag.`,
      snippet: `"dev": "tsx watch --env-file-if-exists=.env.local ${
        info.entry ?? "src/index.ts"
      }"`,
    });
    return;
  }

  const next = `${match[1]} --env-file-if-exists=.env.local${dev.slice(
    match[1].length
  )}`;
  const search = JSON.stringify(dev);
  const at = text.indexOf(`"dev": ${search}`);
  if (at === -1) return;
  const valueAt = at + `"dev": `.length;
  p.modifyFile(
    "package.json",
    text.slice(0, valueAt) +
      JSON.stringify(next) +
      text.slice(valueAt + search.length),
    {
      capability: "cloud",
      summary: "Load .env.local in the dev script",
      inserted: [{ at: valueAt, text: JSON.stringify(next) }],
    }
  );
};

const serverPlanner = (id: "hono" | "express") => {
  const recipe = id;
  const aiRecipe = `${id}-ai` as const;

  const planEditor = (p: Planner, info: ServerInfo) => {
    const dir = puckDir(p.vfs, p.ctx.root, info);
    const file = `${dir}/pages.ts`;
    copyTemplateFiles(
      p,
      recipe,
      [
        { from: PAGES.from, to: file },
        { from: "database.json", to: "database.json", ifMissing: true },
      ],
      { moduleMap: {} }
    );
    planMount(p, info, PAGES.name, file, "editor");
    p.warn(
      "PUCK-CLI-W-PAGES-PUBLIC",
      "The /api/pages route is public. Add authentication before deploying."
    );
  };

  const planCloudRoute = (p: Planner, info: ServerInfo, withAi = false) => {
    const aiRoute = withCloudHost(
      templateText(p.templates, aiRecipe, CLOUD.from),
      p.cloudHost
    );
    const cloudRoute = withCloudHost(
      withoutAiOptions(templateText(p.templates, aiRecipe, CLOUD.from)),
      p.cloudHost
    );
    const route = withAi ? aiRoute : cloudRoute;
    const existing = p.state.cloud.routeFile;
    const file = existing ?? `${puckDir(p.vfs, p.ctx.root, info)}/cloud.ts`;

    if (!(CLOUD_CLIENT_PEER.name in p.ctx.deps)) {
      p.addDependency(CLOUD_CLIENT_PEER.name, CLOUD_CLIENT_PEER.range, "cloud");
    }

    if (existing) {
      if (withAi) planAiRoute(p, existing, cloudRoute, route);
    } else {
      const outcome = p.createFile(file, route, {
        capability: "cloud",
        summary: `Create ${file} (Puck Cloud API route)`,
      });
      if (outcome === "conflict") {
        p.manual({
          id: "cloud:route-conflict",
          type: "manual_edit",
          capability: "cloud",
          required: true,
          file,
          reason: "conflict",
          message: `${file} already exists and doesn't use puckHandler.`,
          instructions:
            "Serve Puck Cloud requests from /api/puck/* using puckHandler from @puckeditor/cloud-client.",
          snippet: route,
        });
        return;
      }
    }

    if (p.state.cloud.routeRegistered !== true) {
      planMount(p, info, CLOUD.name, file, "cloud");
    }
    planEnvLoading(p, info);
  };

  const adapter: FrameworkAdapter<ServerInfo> = {
    kind: "server",
    recipe: (withAi) => (withAi ? aiRecipe : recipe),
    recipeCloudRoute: CLOUD.from,
    appDir: (info) =>
      info.entry ? path.posix.dirname(info.entry).replace(/^\.$/, "") : "",
    configDirs: () => [],
    envDir: () => "",
    detectCloudRoute: (info, vfs, root, scan) => {
      const expectedRouteFile = `${puckDir(vfs, root, info)}/cloud.ts`;
      const routeFile = findCloudRoute(scan, "", expectedRouteFile);
      const code = info.entry
        ? vfs.readText(path.join(root, info.entry)) ?? ""
        : "";
      return {
        expectedRouteFile,
        routeFile,
        routeRegistered:
          Boolean(routeFile && info.entry) &&
          isMounted(code, info.entry!, info.id, {
            source: importSource(info, routeFile!),
          }),
      };
    },
    detectPagesApi: (info, vfs, root) => {
      const file = `${puckDir(vfs, root, info)}/pages.ts`;
      if (!vfs.exists(path.join(root, file))) return null;
      const code = info.entry
        ? vfs.readText(path.join(root, info.entry)) ?? ""
        : "";
      return {
        file,
        mounted:
          Boolean(info.entry) &&
          isMounted(code, info.entry!, info.id, {
            name: PAGES.name,
            source: importSource(info, file),
          }),
      };
    },
    planEditor: (p, info) => planEditor(p, info),
    planCloudRoute,
    // The AI plugin goes in the editor; this server only enables AI in its Cloud route
    planAi: () => {},
    devUrl: "http://localhost:3000/api/pages?path=/",
    deployEnvWarning: `Node doesn't load .env files in production. Set ${ENV_KEY} in the environment wherever the server runs.`,
  };
  return adapter;
};

export const honoAdapter = serverPlanner("hono") as FrameworkAdapter<HonoInfo>;
export const expressAdapter = serverPlanner(
  "express"
) as FrameworkAdapter<ExpressInfo>;
