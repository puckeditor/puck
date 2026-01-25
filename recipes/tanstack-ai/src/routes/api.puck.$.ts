import { puckHandler } from "@puckeditor/cloud-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/puck/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return puckHandler(request, {
          ai: {
            // Replace with your business context
            context: "We are Google. You create Google landing pages.",
          },
        });
      },
    },
  },
});
