// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
import { puckHandler } from "@puckeditor/cloud-client";

const handleRequest = (request) => {
  return puckHandler(request, {
    ai: {
      // Replace with your business context
      context: "We are Google. You create Google landing pages.",
    },
  });
};

export const DELETE = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
