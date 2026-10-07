import { CLOUD_CLIENT_AUTH_ENTRY } from "../constants";
import { tryParseModule } from "../ast/parse";
import { quoteOf } from "../ast/config-object";

/**
 * How a Cloud route identifies who's calling. Puck Pages needs every route to
 * say: "unowned" keeps today's behaviour, where anyone who can reach the
 * route acts with the API key, and "puckAuth" requires Sign in with Puck.
 */
export type RouteAuth = "unowned" | "puckAuth";

const UNOWNED = "() => ({ id: null })";

const authenticateValue = (auth: RouteAuth) =>
  auth === "puckAuth" ? "puckAuth" : UNOWNED;

const insertAfterImports = (code: string, filename: string, text: string) => {
  const ast = tryParseModule(code, filename);
  const imports = ast?.program.body.filter(
    (s) => s.type === "ImportDeclaration"
  );
  const last = imports?.[imports.length - 1];
  if (!last) return `${text}\n${code}`;
  return code.slice(0, last.end!) + `\n${text}` + code.slice(last.end!);
};

const importPuckAuth = (code: string, filename: string, host?: string) => {
  const q = quoteOf(code);
  if (!host)
    return insertAfterImports(
      code,
      filename,
      `import { puckAuth } from ${q}${CLOUD_CLIENT_AUTH_ENTRY}${q};`
    );
  return insertAfterImports(
    code,
    filename,
    `import { createPuckAuth } from ${q}${CLOUD_CLIENT_AUTH_ENTRY}${q};\n\nconst puckAuth = createPuckAuth({ host: ${JSON.stringify(
      host
    )} });`
  );
};

/**
 * Sets `authenticate` on a Cloud route the CLI generated, keeping any other
 * options. Returns null when the route isn't one it recognises, or already
 * authenticates some other way and Sign in with Puck was asked for.
 *
 * `host` is the non-default Puck Cloud the route uses, which Sign in with
 * Puck must use too.
 */
export const withRouteAuth = (
  route: string,
  filename: string,
  auth: RouteAuth,
  host?: string
): string | null => {
  const value = authenticateValue(auth);

  if (/\bauthenticate\b/.test(route)) {
    if (auth === "unowned" || /\bpuckAuth\b/.test(route)) return route;
    if (!route.includes(`authenticate: ${UNOWNED}`)) return null;
    return importPuckAuth(
      route.replace(`authenticate: ${UNOWNED}`, `authenticate: ${value}`),
      filename,
      host
    );
  }

  // Each object is `{}`, `{ a, b }` or spread over lines
  const options = /const options: PuckCloudOptions = \{(\}|\n([ \t]*)| )/;
  const call = /puckHandler\(request(\)|, \{(\n([ \t]*)| ))/;
  const entry = (rest: string, indent = "") =>
    rest === "}"
      ? ` authenticate: ${value} }`
      : rest === " "
      ? ` authenticate: ${value}, `
      : `\n${indent}authenticate: ${value},\n${indent}`;
  let next: string;

  if (options.test(route)) {
    next = route
      .replace(
        options,
        (_, rest, indent) =>
          `const options: PuckHandlerOptions = {${entry(rest, indent)}`
      )
      .replace(
        "import type { PuckCloudOptions }",
        "import type { PuckHandlerOptions }"
      );
  } else if (call.test(route)) {
    next = route.replace(call, (_, rest, inner, indent) =>
      rest === ")"
        ? `puckHandler(request, {${entry("}")})`
        : `puckHandler(request, {${entry(inner, indent)}`
    );
  } else {
    return null;
  }

  return auth === "puckAuth" ? importPuckAuth(next, filename, host) : next;
};
