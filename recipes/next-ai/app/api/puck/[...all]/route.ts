// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
import type { NextRequest } from "next/server";
import { puckHandler } from "@puckeditor/cloud-client";

const handleRequest = (request: NextRequest): Promise<Response> => {
  return puckHandler(request, {
    ai: {
      // Replace with your business context
      context: "We are Google. You create Google landing pages.",
      designMode: {
        // Allow AI to generate new components using "design mode"
        // Learn more: https://puckeditor.com/docs/ai/design-mode
        allowed: true,
        // Constrain component generation, replace with your own instructions
        instructions: `
        #### Color Palette

        Always use the following colors:

        * Primary: \`#1976d2\`
        * Secondary: \`#9c27b0\`
        `,
      },
    },
  });
};

export const DELETE = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
