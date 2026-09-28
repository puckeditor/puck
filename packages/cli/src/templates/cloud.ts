/**
 * Cloud route templates. These are the routes from each framework's AI recipe
 * without the Puck AI options, which the `cloud` capability doesn't configure.
 */
export const NEXT_CLOUD_ROUTE = `// Handles requests from Puck to Puck Cloud
// Learn more: https://puckeditor.com/docs/cli
import type { NextRequest } from "next/server";
import { puckHandler } from "@puckeditor/cloud-client";

const handleRequest = (request: NextRequest): Promise<Response> => {
  return puckHandler(request);
};

export const DELETE = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
`;

export const REACT_ROUTER_CLOUD_ROUTE = `// Handles requests from Puck to Puck Cloud
// Learn more: https://puckeditor.com/docs/cli
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { PuckCloudOptions } from "@puckeditor/cloud-client";
import { puckHandler } from "@puckeditor/cloud-client";

const options: PuckCloudOptions = {};

export async function loader(args: LoaderFunctionArgs) {
  return puckHandler(args.request, options);
}

export async function action(args: ActionFunctionArgs) {
  return puckHandler(args.request, options);
}
`;

export const TANSTACK_START_CLOUD_ROUTE = `// Handles requests from Puck to Puck Cloud
// Learn more: https://puckeditor.com/docs/cli
import { createFileRoute } from "@tanstack/react-router";
import type { PuckCloudOptions } from "@puckeditor/cloud-client";
import { puckHandler } from "@puckeditor/cloud-client";

const options: PuckCloudOptions = {};

const handleRequest = ({ request }: { request: Request }) =>
  puckHandler(request, options);

export const Route = createFileRoute("/api/puck/$")({
  server: {
    handlers: {
      GET: handleRequest,
      POST: handleRequest,
      DELETE: handleRequest,
    },
  },
});
`;

/**
 * An AI recipe's Cloud route without the Puck AI options, for recipes whose
 * route has more than the handler (e.g. Express's request conversion)
 */
export const withoutAiOptions = (route: string) =>
  route
    .replace(
      /^\/\/ Handles all requests for Puck AI\n\/\/ Learn more: .*\n/,
      "// Handles requests from Puck to Puck Cloud\n// Learn more: https://puckeditor.com/docs/cli\n"
    )
    .replace(
      /const options: PuckCloudOptions = \{\n[\s\S]*?\n\};/,
      "const options: PuckCloudOptions = {};"
    );

/**
 * Points puckHandler at a non-default Puck Cloud, e.g. when PUCK_CLOUD_URL
 * is set for a local or staging cloud.
 */
export const withCloudHost = (route: string, host?: string) => {
  if (!host) return route;
  const value = JSON.stringify(host);
  return route
    .replace("puckHandler(request)", `puckHandler(request, { host: ${value} })`)
    .replace(
      "const options: PuckCloudOptions = {};",
      `const options: PuckCloudOptions = { host: ${value} };`
    )
    .replace(/(\{\n)([ \t]*)ai:/, `$1$2host: ${value},\n$2ai:`);
};
