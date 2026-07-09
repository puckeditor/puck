// Derive dist/no-external.css from dist/index.css by stripping remote
// `@import` rules (e.g. the Inter webfont). Mirrors @puckeditor/core's
// `no-external.css`, for users who self-host fonts / disallow remote CSS.
//
// Kept as a post-build step (rather than a second tsup entry) so each framework
// package ships exactly one JS bundle and therefore exactly one bundled Preact
// copy. Shared across framework packages; the `dist` dir is resolved relative
// to the build cwd (the framework package dir), so run it from there:
//   node ../tsup-config/make-no-external-css.mjs
import fs from "fs";
import path from "path";

const distDir = path.resolve(process.cwd(), "dist");
const indexCssPath = path.join(distDir, "index.css");
const noExternalCssPath = path.join(distDir, "no-external.css");

if (!fs.existsSync(indexCssPath)) {
  throw new Error(
    `Expected ${indexCssPath} to exist. Did the tsup build emit CSS?`
  );
}

const indexCss = fs.readFileSync(indexCssPath, "utf8");

// Remove any top-level `@import` that points at a remote (http/https) URL,
// whether written as `@import "url"` or `@import url("url")`.
const noExternalCss = indexCss
  .replace(/^@import\s+(?:url\(\s*)?["']https?:\/\/[^\n]*\r?\n/gim, "")
  .replace(/^\s*\r?\n/, "");

fs.writeFileSync(noExternalCssPath, noExternalCss);

console.log(
  `make-no-external-css: wrote ${noExternalCssPath} (${noExternalCss.length} bytes)`
);
