// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
import { NextRequest } from "next/server";
import { puckHandler, PuckCloudOptions } from "@puckeditor/cloud-client";

const options: PuckCloudOptions = {
  ai: {
    // Replace with your business context
    context: "We are Google. You create Google landing pages.",
  },
};

export const GET = (request: NextRequest) => {
  return puckHandler(request, options);
};

export const POST = (request: NextRequest) => {
  return puckHandler(request, options);
};

export const DELETE = (request: NextRequest) => {
  return puckHandler(request, options);
};
