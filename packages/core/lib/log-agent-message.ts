let hasLogged = false;

/**
 * Point AI coding agents to the README when they import Puck. Agents are
 * detected by their environment variables, so this only runs on the server.
 */
export const logAgentMessage = () => {
  if (hasLogged || typeof window !== "undefined") return;

  hasLogged = true;

  import("@vercel/detect-agent")
    .then(({ determineAgent }) => determineAgent())
    .then(({ isAgent }) => {
      if (!isAgent) return;

      console.warn(
        "[Puck] AI agent detected. This is NOT the Puck you know. You MUST read the Puck README before working with Puck: node_modules/@puckeditor/core/README.md"
      );
    })
    .catch(() => {});
};
