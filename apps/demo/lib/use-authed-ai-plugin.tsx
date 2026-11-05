import { ReactNode, useEffect, useMemo } from "react";
import { createAiPlugin } from "@puckeditor/plugin-ai";
import { PuckSignInIdentity } from "@puckeditor/cloud-client";
import type { Plugin, UiState } from "@/core/types";

// The prompt submitted before signing in, sent once the user is back
const pendingPromptKey = "puck-demo-pending-prompt";

const options = {
  designMode: {
    visible: true,
  },
  defaultMode: "design",
} as const;

/**
 * Saves the prompt, then sends the user to sign in to Puck Cloud and back to
 * this page
 */
const signInToSubmit = async (prompt: string) => {
  const returnTo = window.location.pathname + window.location.search;
  const res = await fetch(
    `/api/login-url?returnTo=${encodeURIComponent(returnTo)}`
  );

  // Throwing keeps the prompt in the chat and shows an error
  if (res.status !== 200) throw new Error("Sign in failed");

  const data = await res.json();

  sessionStorage.setItem(pendingPromptKey, prompt);

  window.location = data.url;
};

// Signed out, submitting a prompt asks the user to sign in instead of sending it
const signedOutAiPlugin = createAiPlugin({
  ...options,
  chat: {
    onSubmit: signInToSubmit,
    attachments: { enabled: false },
  },
});

/** Sends the prompt the user submitted before signing in */
const SendPendingPrompt = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // The chat stops sending when it unmounts, so wait until it has stayed
    // mounted, which React's strict mode remount would otherwise interrupt
    const timeout = setTimeout(() => {
      const prompt = sessionStorage.getItem(pendingPromptKey);

      // The chat sets up window.__PUCK_AI in its own effect
      if (!prompt || !window.__PUCK_AI) return;

      sessionStorage.removeItem(pendingPromptKey);

      window.__PUCK_AI.sendMessage({
        role: "user",
        parts: [{ type: "text", text: prompt }],
      });
    });

    return () => clearTimeout(timeout);
  }, []);

  return <>{children}</>;
};

const aiPlugin = createAiPlugin(options);

const signedInAiPlugin: Plugin = {
  ...aiPlugin,
  render: () => <SendPendingPrompt>{aiPlugin.render()}</SendPendingPrompt>,
};

/**
 * Returns the AI plugin, which asks the user to sign in to Puck Cloud when
 * they submit a prompt, and the initial UI state, which opens the plugin when
 * there's a prompt to send.
 */
export const useAuthedAiPlugin = (identity: PuckSignInIdentity | null) =>
  useMemo(() => {
    if (!identity) return { aiPlugin: signedOutAiPlugin };

    const hasPendingPrompt =
      typeof window !== "undefined" &&
      !!sessionStorage.getItem(pendingPromptKey);

    const ui: Partial<UiState> | undefined = hasPendingPrompt
      ? { plugin: { current: aiPlugin.name } }
      : undefined;

    return { aiPlugin: signedInAiPlugin, ui };
  }, [identity]);
