import {
  CLOUD_CLIENT_PACKAGE,
  CORE_PACKAGE,
  PLUGIN_AI_PACKAGE,
  PLUGIN_AUTH_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
} from "../constants";

/** The Puck packages --canary installs the latest canaries of */
export const CANARY_PACKAGES = [
  CORE_PACKAGE,
  CLOUD_CLIENT_PACKAGE,
  PLUGIN_AI_PACKAGE,
  PLUGIN_PAGES_PACKAGE,
  PLUGIN_AUTH_PACKAGE,
];

export const DEFAULT_REGISTRY = "https://registry.npmjs.org";

const TIMEOUT_MS = 15_000;

interface Packument {
  "dist-tags"?: Record<string, string>;
  time?: Record<string, string>;
}

/**
 * The package's `canary` dist-tag, or its most recently published
 * prerelease when it has none. Null when it has neither or can't be read.
 */
const latestCanary = async (
  fetchImpl: typeof fetch,
  registry: string,
  name: string
) => {
  let packument: Packument;
  try {
    const res = await fetchImpl(
      `${registry.replace(/\/+$/, "")}/${name.replace("/", "%2f")}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (!res.ok) return null;
    packument = (await res.json()) as Packument;
  } catch {
    return null;
  }

  const tagged = packument["dist-tags"]?.canary;
  if (tagged) return tagged;

  const [newest] = Object.entries(packument.time ?? {})
    .filter(([version]) => /^\d+\.\d+\.\d+-/.test(version))
    .sort(([, a], [, b]) => b.localeCompare(a));
  return newest?.[0] ?? null;
};

/** Exact versions of the latest canaries, and the packages without one */
export const resolveCanaries = async (
  fetchImpl: typeof fetch,
  registry = DEFAULT_REGISTRY
) => {
  const found = await Promise.all(
    CANARY_PACKAGES.map(
      async (name) =>
        [name, await latestCanary(fetchImpl, registry, name)] as const
    )
  );
  return {
    versions: Object.fromEntries(
      found.filter(([, version]) => version !== null)
    ) as Record<string, string>,
    missing: found.filter(([, version]) => version === null).map(([n]) => n),
  };
};
