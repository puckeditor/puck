import type { ActionFunctionArgs } from "@remix-run/node";
import { puckHandler } from "@puckeditor/cloud-client";

// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
export async function action(args: ActionFunctionArgs) {
  return puckHandler(args.request, {
    ai: {
      // Replace with your business context
      context: "We are Google. You create Google landing pages.",
    },
  });
}
