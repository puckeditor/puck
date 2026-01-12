import { NextRequest } from "next/server";
import { puckHandler } from "@puckeditor/cloud-client";

// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
export const POST = (request: NextRequest) => {
  return puckHandler(request, {
    ai: {
      // Replace with your business context
      context: "We are Google. You create Google landing pages.",
    },
  });
};
