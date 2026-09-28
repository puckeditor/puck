// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
import fs from "node:fs";
import type { APIRoute } from "astro";
import type { PuckCloudOptions } from "@puckeditor/cloud-client";
import { puckHandler } from "@puckeditor/cloud-client";

export const prerender = false;

// Astro doesn't put .env files in process.env, where puckHandler reads
// PUCK_API_KEY. Production servers read it from their environment.
if (import.meta.env.DEV && fs.existsSync(".env.local"))
  process.loadEnvFile(".env.local");

const options: PuckCloudOptions = {
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
};

export const ALL: APIRoute = ({ request }) => puckHandler(request, options);
