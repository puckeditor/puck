// PostHog Analytics initialization
import posthog from "posthog-js";

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ev",
    ui_host: "https://eu.posthog.com",
    defaults: "2025-11-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
