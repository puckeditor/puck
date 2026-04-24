import { defineConfig } from "tsup";
import tsupconfig from "../tsup-config";
import path from "path";
import { build, type Plugin } from "esbuild";
import { cssModulePlugin } from "../tsup-config/css-module-plugin";

const packageRoot = path.resolve(import.meta.dirname);

const runtimeCssStubPlugin: Plugin = {
  name: "runtime-css-stub",
  setup(buildApi) {
    buildApi.onResolve({ filter: /generated\/runtime-css$/ }, () => ({
      path: "runtime-css-stub",
      namespace: "runtime-css-stub",
    }));

    buildApi.onLoad({ filter: /.*/, namespace: "runtime-css-stub" }, () => ({
      contents: `
          export const defaultUiStyles = "";
          export const iframeInteractionStyles = "";
        `,
      loader: "js" as const,
    }));
  },
};

const readBundledCss = async (entryPoint: string): Promise<string> => {
  const isCssEntry = entryPoint.endsWith(".css");
  const result = await build({
    absWorkingDir: packageRoot,
    bundle: true,
    format: "iife",
    logLevel: "silent",
    packages: "external",
    platform: "browser",
    plugins: [runtimeCssStubPlugin, cssModulePlugin],
    target: ["es2020"],
    outdir: "out",
    write: false,
    ...(isCssEntry
      ? {
          stdin: {
            contents: `import "./${entryPoint}";`,
            loader: "ts" as const,
            resolveDir: packageRoot,
            sourcefile: "runtime-css-entry.ts",
          },
        }
      : {
          entryPoints: [entryPoint],
        }),
  });

  const styles = result.outputFiles
    .filter((file) => file.path.endsWith(".css"))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => file.text.trim())
    .filter(Boolean);

  if (styles.length === 0) {
    throw new Error(`No CSS output was generated for ${entryPoint}`);
  }

  return styles.join("\n\n");
};

let cachedContents: string | null = null;

const runtimeCssPlugin: Plugin = {
  name: "runtime-css",
  setup(buildApi) {
    buildApi.onResolve({ filter: /generated\/runtime-css/ }, (args) => {
      if (!args.resolveDir.endsWith(path.join("core", "lib"))) {
        return undefined;
      }

      return {
        path: "puck-runtime-css",
        namespace: "puck-runtime-css",
      };
    });

    buildApi.onLoad(
      { filter: /.*/, namespace: "puck-runtime-css" },
      async () => {
        if (!cachedContents) {
          const [defaultStyles, interactionStyles] = await Promise.all([
            readBundledCss("bundle/index.ts"),
            readBundledCss("bundle/iframe-styles.ts"),
          ]);

          cachedContents = [
            `export const defaultUiStyles = ${JSON.stringify(defaultStyles)};`,
            `export const iframeInteractionStyles = ${JSON.stringify(
              interactionStyles
            )};`,
          ].join("\n");
        }

        return {
          contents: cachedContents,
          loader: "js" as const,
        };
      }
    );
  },
};

export default defineConfig({
  ...tsupconfig,
  esbuildPlugins: [...(tsupconfig.esbuildPlugins ?? []), runtimeCssPlugin],
});
