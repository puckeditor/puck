export interface ConnectSession {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export type PollResult =
  | {
      status: "approved";
      apiKey: string;
      keyId: string;
      keyName: string;
      organization: { id: string; name: string };
    }
  | { status: "pending" | "slow_down" | "denied" | "expired" | "invalid" }
  | { status: "error"; message: string };

export type KeyCheck = "valid" | "invalid" | "unreachable";

export interface ImportedPages {
  /** Routes created and published */
  created: string[];
  /** Routes that already had a page, which are left as they are */
  skipped: string[];
}

/** A page on the API key's branch, from GET /api/pages */
export interface CloudPageSummary {
  id: string;
  path: string;
  /** The latest version's number */
  version: number;
  /** The published version's number, if the page is published */
  publishedVersion: number | null;
}

export interface CloudApi {
  baseUrl: string;
  startConnect(client: {
    cliVersion: string;
    hostname?: string;
    projectName?: string;
    framework?: string;
    /** The branch to connect to; Puck Cloud preselects it, or offers to create it */
    branch?: string;
    /** Lets Puck Cloud link this machine's telemetry to the approving account */
    anonymousId?: string;
  }): Promise<ConnectSession>;
  pollConnect(deviceCode: string): Promise<PollResult>;
  verifyKey(apiKey: string): Promise<KeyCheck>;
  /** Creates and publishes pages, keyed by route. Up to IMPORT_BATCH_SIZE at a time */
  importPages(
    apiKey: string,
    pages: Record<string, unknown>
  ): Promise<ImportedPages>;
  /** The pages on the API key's branch */
  listPages(apiKey: string): Promise<CloudPageSummary[]>;
  /** A version's Puck data */
  getPageVersion(apiKey: string, id: string, version: number): Promise<unknown>;
  /**
   * Saves data as the page's latest version, refused if a version newer than
   * `previousVersion` was saved. Returns the new version's number.
   */
  saveVersion(
    apiKey: string,
    id: string,
    data: unknown,
    previousVersion: number
  ): Promise<number>;
  /** Publishes one of the page's versions */
  publishVersion(apiKey: string, id: string, version: number): Promise<void>;
}

export class CloudRequestError extends Error {
  constructor(
    message: string,
    public kind: "unreachable" | "rate_limited" | "bad_response" | "rejected"
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 15_000;
// Each page is stored as a new version, so batches take longer
const IMPORT_TIMEOUT_MS = 60_000;

/** Puck Cloud accepts up to 500 pages per request */
export const IMPORT_BATCH_SIZE = 100;

const POLL_ERRORS: Record<string, PollResult["status"]> = {
  authorization_pending: "pending",
  slow_down: "slow_down",
  access_denied: "denied",
  expired_token: "expired",
  invalid_grant: "invalid",
};

export const createCloudApi = (
  baseUrl: string,
  fetchImpl: typeof fetch
): CloudApi => {
  const url = (p: string) =>
    new URL(p, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();

  const request = async (
    p: string,
    init: RequestInit,
    timeout = TIMEOUT_MS
  ) => {
    try {
      return await fetchImpl(url(p), {
        ...init,
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      throw new CloudRequestError(
        `Couldn't reach Puck Cloud at ${baseUrl}: ${(err as Error).message}`,
        "unreachable"
      );
    }
  };

  const json = async (res: Response) => {
    try {
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  /** A pages API response, throwing when Puck Cloud refused it */
  const pagesResponse = async (res: Response, action: string) => {
    const body = await json(res);
    if (res.status === 401 || res.status === 403)
      throw new CloudRequestError(
        "Puck Cloud rejected the API key",
        "rejected"
      );
    if (res.status === 429)
      throw new CloudRequestError(
        "Too many requests. Wait a minute and try again.",
        "rate_limited"
      );
    if (!res.ok)
      throw new CloudRequestError(
        typeof body.error === "string"
          ? `Puck Cloud couldn't ${action}: ${body.error}`
          : `Puck Cloud returned an unexpected response (${res.status})`,
        "bad_response"
      );
    return body;
  };

  const unexpected = (res: Response) =>
    new CloudRequestError(
      `Puck Cloud returned an unexpected response (${res.status})`,
      "bad_response"
    );

  return {
    baseUrl,

    async startConnect(client) {
      const res = await request("api/cli/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(client),
      });
      if (res.status === 429) {
        throw new CloudRequestError(
          "Too many connection attempts. Wait a minute and try again.",
          "rate_limited"
        );
      }
      const body = await json(res);
      if (
        !res.ok ||
        typeof body.deviceCode !== "string" ||
        typeof body.verificationUriComplete !== "string"
      ) {
        throw new CloudRequestError(
          `Puck Cloud returned an unexpected response (${res.status})`,
          "bad_response"
        );
      }
      return body as unknown as ConnectSession;
    },

    async pollConnect(deviceCode) {
      const res = await request("api/cli/connect/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceCode }),
      });
      const body = await json(res);
      if (res.ok && typeof body.apiKey === "string") {
        return { status: "approved", ...(body as object) } as PollResult;
      }
      const mapped =
        typeof body.error === "string" ? POLL_ERRORS[body.error] : undefined;
      if (mapped) return { status: mapped } as PollResult;
      const code = typeof body.error === "string" ? ` ${body.error}` : "";
      return {
        status: "error",
        message:
          res.status >= 500
            ? `Puck Cloud couldn't create an API key (${res.status}${code})`
            : `Puck Cloud returned an unexpected response (${res.status}${code})`,
      };
    },

    async verifyKey(apiKey) {
      try {
        const res = await request("api/healthcheck", {
          headers: { "x-api-key": apiKey },
        });
        if (res.ok) return "valid";
        return res.status === 404 || res.status === 401 || res.status === 403
          ? "invalid"
          : "unreachable";
      } catch {
        return "unreachable";
      }
    },

    async importPages(apiKey, pages) {
      const res = await request(
        "api/pages/batch",
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ pages }),
        },
        IMPORT_TIMEOUT_MS
      );
      const body = await pagesResponse(res, "import the pages");
      if (!Array.isArray(body.created) || !Array.isArray(body.skipped))
        throw unexpected(res);
      return { created: body.created, skipped: body.skipped };
    },

    async listPages(apiKey) {
      const pages: CloudPageSummary[] = [];
      // The list comes a page at a time
      for (;;) {
        const res = await request(`api/pages?offset=${pages.length}`, {
          headers: { "x-api-key": apiKey },
        });
        const body = await pagesResponse(res, "list the pages");
        if (!Array.isArray(body.results)) throw unexpected(res);
        for (const page of body.results as Record<string, unknown>[]) {
          // Without versions, every page would look like it had nothing to migrate
          if (typeof page.version !== "number") throw unexpected(res);
          pages.push({
            id: String(page.id),
            path: String(page.path),
            version: page.version,
            publishedVersion: (page.publishedVersion as number | null) ?? null,
          });
        }
        if (body.hasMore !== true || !body.results.length) return pages;
      }
    },

    async getPageVersion(apiKey, id, version) {
      const res = await request(
        `api/pages/${encodeURIComponent(id)}?version=${version}`,
        { headers: { "x-api-key": apiKey } }
      );
      const body = await pagesResponse(res, "read the page");
      if (body.data === undefined) throw unexpected(res);
      return body.data;
    },

    async saveVersion(apiKey, id, data, previousVersion) {
      const res = await request(
        `api/pages/${encodeURIComponent(id)}/versions`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({ data, previousVersion }),
        },
        IMPORT_TIMEOUT_MS
      );
      const body = await pagesResponse(res, "save the page");
      if (typeof body.version !== "number") throw unexpected(res);
      return body.version;
    },

    async publishVersion(apiKey, id, version) {
      const res = await request(`api/pages/${encodeURIComponent(id)}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ version }),
      });
      await pagesResponse(res, "publish the page");
    },
  };
};
