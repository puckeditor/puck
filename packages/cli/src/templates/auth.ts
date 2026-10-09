import { CLOUD_CLIENT_AUTH_ENTRY } from "../constants";
import { tryParseModule } from "../ast/parse";
import { quoteOf } from "../ast/config-object";

/**
 * How a Cloud route identifies who's calling. Puck Pages needs every route to
 * say: "unowned" keeps today's behaviour, where anyone who can reach the
 * route acts with the API key, and "signIn" requires Sign in with Puck.
 */
export type RouteAuth = "unowned" | "signIn";

const UNOWNED = "() => ({ id: null })";

/**
 * Imports Sign in with Puck's functions, or creates them against a
 * non-default Puck Cloud, e.g. when PUCK_CLOUD_URL is set
 */
export const signInSetup = (names: string[], host?: string) =>
  host
    ? {
        imports: `import { createPuckAuth } from "${CLOUD_CLIENT_AUTH_ENTRY}";`,
        create: `\nconst { ${names.join(
          ", "
        )} } = createPuckAuth({ host: ${JSON.stringify(host)} });\n`,
      }
    : {
        imports: `import { ${names.join(
          ", "
        )} } from "${CLOUD_CLIENT_AUTH_ENTRY}";`,
        create: "",
      };

const insertAfterImports = (code: string, filename: string, text: string) => {
  const ast = tryParseModule(code, filename);
  const imports = ast?.program.body.filter(
    (s) => s.type === "ImportDeclaration"
  );
  const last = imports?.[imports.length - 1];
  if (!last) return `${text}\n${code}`;
  return code.slice(0, last.end!) + `\n${text}` + code.slice(last.end!);
};

const importAuthenticate = (code: string, filename: string, host?: string) => {
  const q = quoteOf(code);
  const setup = signInSetup(["authenticate"], host);
  return insertAfterImports(
    code,
    filename,
    `${setup.imports.replace(/"/g, q)}${
      setup.create ? `\n${setup.create.trimEnd()}` : ""
    }`
  );
};

const usesSignIn = (code: string) =>
  code.includes(`"${CLOUD_CLIENT_AUTH_ENTRY}"`) ||
  code.includes(`'${CLOUD_CLIENT_AUTH_ENTRY}'`);

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
  // Sign in with Puck's authenticate is imported under its own name
  const property =
    auth === "signIn" ? "authenticate" : `authenticate: ${UNOWNED}`;

  if (/\bauthenticate\b/.test(route)) {
    if (auth === "unowned" || usesSignIn(route)) return route;
    if (!route.includes(`authenticate: ${UNOWNED}`)) return null;
    return importAuthenticate(
      route.replace(`authenticate: ${UNOWNED}`, property),
      filename,
      host
    );
  }

  // Each object is `{}`, `{ a, b }` or spread over lines
  const options = /const options: PuckCloudOptions = \{(\}|\n([ \t]*)| )/;
  const call = /puckHandler\(request(\)|, \{(\n([ \t]*)| ))/;
  const entry = (rest: string, indent = "") =>
    rest === "}"
      ? ` ${property} }`
      : rest === " "
      ? ` ${property}, `
      : `\n${indent}${property},\n${indent}`;
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

  return auth === "signIn" ? importAuthenticate(next, filename, host) : next;
};

/** Next.js: lib/puck-auth.ts */
export const nextPuckAuth = (host?: string) => {
  const setup = signInSetup(["getSession", "loginUrl"], host);
  return `${setup.imports}
import { headers } from "next/headers";
import { redirect } from "next/navigation";
${setup.create}
/** Sends anyone who isn't signed in with Puck to sign in, then back to returnTo */
export async function requirePuckSession(returnTo: string) {
  const session = await getSession(await headers());

  if (!session) {
    redirect(loginUrl(returnTo));
  }

  return session;
}
`;
};

/**
 * `next` with the same authenticate as `current`, when `current` is `base`
 * with or without one. Lets other edits recognise routes Pages or Auth set
 * authenticate on.
 */
export const withSameRouteAuth = (
  current: string,
  base: string,
  next: string,
  filename: string,
  host?: string
): string | null => {
  if (current === base) return next;
  for (const auth of ["unowned", "signIn"] as const) {
    if (current === withRouteAuth(base, filename, auth, host))
      return withRouteAuth(next, filename, auth, host);
  }
  return null;
};

/** React Router: app/lib/puck-auth.server.ts */
export const reactRouterPuckAuth = (host?: string) => {
  const setup = signInSetup(["getSession", "loginUrl"], host);
  return `import { redirect } from "react-router";
${setup.imports}
${setup.create}
/** Sends anyone who isn't signed in with Puck to sign in, then back here */
export async function requirePuckSession(request: Request) {
  const session = await getSession(request.headers);

  if (!session) {
    const url = new URL(request.url);
    throw redirect(loginUrl(\`\${url.pathname}\${url.search}\`));
  }

  return session;
}
`;
};

/** TanStack Start: src/lib/puck-auth.ts */
export const tanstackPuckAuth = (host?: string) => {
  const setup = signInSetup(["getSession", "loginUrl"], host);
  return `import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
${setup.imports}
${setup.create}
/** Sends anyone who isn't signed in with Puck to sign in, then back to returnTo */
export const requirePuckSession = createServerFn({ method: "GET" })
  .validator((returnTo: string) => returnTo)
  .handler(async ({ data: returnTo }) => {
    const session = await getSession(getRequest().headers);

    if (!session) {
      throw redirect({ href: loginUrl(returnTo) });
    }

    return session;
  });
`;
};

/** Apps without a server render: src/puck/require-session.tsx */
export const REQUIRE_SESSION = `import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Sends anyone who isn't signed in with Puck to sign in, then back here. The
 * Puck Cloud API route checks the session too, so this only saves signed-out
 * visitors from an editor they can't use.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/puck/auth/session").then((response) => {
      if (response.ok) return setSignedIn(true);

      const returnTo = \`\${window.location.pathname}\${window.location.search}\`;
      window.location.assign(
        \`/api/puck/auth/login?returnTo=\${encodeURIComponent(returnTo)}\`
      );
    });
  }, []);

  return signedIn ? children : null;
}
`;

/** Astro: src/lib/puck-auth.ts */
export const astroPuckAuth = (host?: string) => {
  const setup = signInSetup(["getSession", "loginUrl"], host);
  return `import fs from "node:fs";
${setup.imports}

// Astro doesn't put .env files in process.env, where Sign in with Puck reads
// its settings. Production servers read them from their environment.
if (import.meta.env.DEV && fs.existsSync(".env.local"))
  process.loadEnvFile(".env.local");
${setup.create}
/** Where to send visitors who aren't signed in with Puck, or null if they are */
export const puckSignInUrl = async (request: Request) => {
  if (await getSession(request.headers)) return null;

  const url = new URL(request.url);
  return loginUrl(\`\${url.pathname}\${url.search}\`);
};
`;
};
