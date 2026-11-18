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
      const body = await json(res);
      if (res.status === 401 || res.status === 403) {
        throw new CloudRequestError(
          "Puck Cloud rejected the API key",
          "rejected"
        );
      }
      if (res.status === 429) {
        throw new CloudRequestError(
          "Too many requests. Wait a minute and try again.",
          "rate_limited"
        );
      }
      if (
        !res.ok ||
        !Array.isArray(body.created) ||
        !Array.isArray(body.skipped)
      ) {
        throw new CloudRequestError(
          typeof body.error === "string"
            ? `Puck Cloud couldn't import the pages: ${body.error}`
            : `Puck Cloud returned an unexpected response (${res.status})`,
          "bad_response"
        );
      }
      return { created: body.created, skipped: body.skipped };
    },
  };
};
