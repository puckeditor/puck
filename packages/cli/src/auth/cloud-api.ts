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

export interface CloudApi {
  baseUrl: string;
  startConnect(client: {
    cliVersion: string;
    hostname?: string;
    projectName?: string;
    framework?: string;
    /** Lets Puck Cloud link this machine's telemetry to the approving account */
    anonymousId?: string;
  }): Promise<ConnectSession>;
  pollConnect(deviceCode: string): Promise<PollResult>;
  verifyKey(apiKey: string): Promise<KeyCheck>;
}

export class CloudRequestError extends Error {
  constructor(
    message: string,
    public kind: "unreachable" | "rate_limited" | "bad_response"
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 15_000;

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

  const request = async (p: string, init: RequestInit) => {
    try {
      return await fetchImpl(url(p), {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
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
  };
};
