import type { IframeConfig } from "../types";

export type NormalizedIframeConfig = Required<IframeConfig>;

export const normalizeIframeConfig = (
  iframe?: IframeConfig
): NormalizedIframeConfig => ({
  enabled: true,
  waitForStyles: true,
  syncHostStyles: true,
  ...iframe,
});
