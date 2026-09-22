import { puckHandler } from "@puckeditor/cloud-client";
import type { PuckCloudOptions } from "@puckeditor/cloud-client";
import { createFileRoute } from "@tanstack/react-router";

const options: PuckCloudOptions = {
  ai: {
    // Replace with your business context
    context: "We are Google. You create Google landing pages.",
    designMode: {
      // Allow AI to generate new components using "design mode".
      // Learn more: https://puckeditor.com/docs/ai/design-mode
      allowed: true,
      // Constrain component generation, replace with your own instructions.
      instructions: `
      #### Color Palette

      Always use the following colors:

      * Primary: \`#1976d2\`
      * Secondary: \`#9c27b0\`
      `,
    },
  },
};

const handleRequest = ({ request }: { request: Request }) =>
  puckHandler(request, options);

export const Route = createFileRoute("/api/puck/$")({
  server: {
    handlers: {
      DELETE: handleRequest,
      GET: handleRequest,
      POST: handleRequest,
    },
  },
});
