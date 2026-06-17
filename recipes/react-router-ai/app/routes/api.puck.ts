// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { PuckCloudOptions } from "@puckeditor/cloud-client";
import { puckHandler } from "@puckeditor/cloud-client";

const options: PuckCloudOptions = {
  ai: {
    // Replace with your business context
    context: "We are Google. You create Google landing pages.",
  },
};

export async function loader(args: LoaderFunctionArgs) {
  return puckHandler(args.request, options);
}

export async function action(args: ActionFunctionArgs) {
  return puckHandler(args.request, options);
}
