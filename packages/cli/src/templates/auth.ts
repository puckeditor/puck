import { CLOUD_CLIENT_PACKAGE } from "../constants";
import { quoteOf } from "../ast/config-object";

/** Sign in with Puck's server functions */
const SIGN_IN_IMPORT = `import { getPuckIdentity, loginUrl } from "${CLOUD_CLIENT_PACKAGE}";`;

/** getPuckIdentity's options, pointed at PUCK_CLOUD_URL when set */
const identityOptions = (host?: string) =>
  host ? `, { host: ${JSON.stringify(host)} }` : "";

/** Whether a Cloud route requires Sign in with Puck */
export const requiresSignIn = (route: string) =>
  /\bprovider:\s*["']puck["']/.test(route);

/**
 * Requires Sign in with Puck on a Cloud route the CLI generated, keeping any
 * other options. Returns null when the route isn't one it recognises, or
 * already says who its requests are for some other way.
 */
export const withRouteAuth = (route: string): string | null => {
  if (requiresSignIn(route)) return route;
  if (/\bauth\s*:/.test(route)) return null;

  const q = quoteOf(route);
  const property = `auth: { provider: ${q}puck${q} }`;
  // Each object is `{}`, `{ a, b }` or spread over lines
  const options = /const options: PuckCloudOptions = \{(\}|\n([ \t]*)| )/;
  const call = /puckHandler\(request(\)|, \{(\n([ \t]*)| ))/;
  const entry = (rest: string, indent = "") =>
    rest === "}"
      ? ` ${property} }`
      : rest === " "
      ? ` ${property}, `
      : `\n${indent}${property},\n${indent}`;

  if (options.test(route))
    return route.replace(
      options,
      (_, rest, indent) =>
        `const options: PuckCloudOptions = {${entry(rest, indent)}`
    );
  if (call.test(route))
    return route.replace(call, (_, rest, inner, indent) =>
      rest === ")"
        ? `puckHandler(request, {${entry("}")})`
        : `puckHandler(request, {${entry(inner, indent)}`
    );
  return null;
};

/** Next.js: lib/puck-auth.ts */
export const nextPuckAuth = (host?: string) => {
  return `${SIGN_IN_IMPORT}
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** Sends anyone who isn't signed in with Puck to sign in, then back to returnTo */
export async function requirePuckSession(returnTo: string) {
  const session = await getPuckIdentity(await headers()${identityOptions(
    host
  )});

  if (!session) {
    redirect(loginUrl(returnTo));
  }

  return session;
}
`;
};

/**
 * `next` with the same auth as `current`, when `current` is `base` with or
 * without Sign in with Puck. Lets other edits recognise routes Auth changed.
 */
export const withSameRouteAuth = (
  current: string,
  base: string,
  next: string
): string | null => {
  if (current === base) return next;
  if (current === withRouteAuth(base)) return withRouteAuth(next);
  return null;
};

/** React Router: app/lib/puck-auth.server.ts */
export const reactRouterPuckAuth = (host?: string) => {
  return `import { redirect } from "react-router";
${SIGN_IN_IMPORT}

/** Sends anyone who isn't signed in with Puck to sign in, then back here */
export async function requirePuckSession(request: Request) {
  const session = await getPuckIdentity(request.headers${identityOptions(
    host
  )});

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
  return `import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
${SIGN_IN_IMPORT}

/** Sends anyone who isn't signed in with Puck to sign in, then back to returnTo */
export const requirePuckSession = createServerFn({ method: "GET" })
  .validator((returnTo: string) => returnTo)
  .handler(async ({ data: returnTo }) => {
    const session = await getPuckIdentity(getRequest().headers${identityOptions(
      host
    )});

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
  return `import fs from "node:fs";
${SIGN_IN_IMPORT}

// Astro doesn't put .env files in process.env, where Sign in with Puck reads
// its settings. Production servers read them from their environment.
if (import.meta.env.DEV && fs.existsSync(".env.local"))
  process.loadEnvFile(".env.local");

/** Where to send visitors who aren't signed in with Puck, or null if they are */
export const puckSignInUrl = async (request: Request) => {
  if (await getPuckIdentity(request.headers${identityOptions(
    host
  )})) return null;

  const url = new URL(request.url);
  return loginUrl(\`\${url.pathname}\${url.search}\`);
};
`;
};
