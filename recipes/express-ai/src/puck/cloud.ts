// Handles all requests for Puck AI
// Learn more: https://puckeditor.com/docs/ai/getting-started
import { Readable } from "node:stream";
import express from "express";
import type { Request, Response } from "express";
import type { PuckCloudOptions } from "@puckeditor/cloud-client";
import { puckHandler } from "@puckeditor/cloud-client";

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

// puckHandler takes a web Request, so convert Express's request to one
const toWebRequest = (req: Request) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.readableEnded) {
      // A body parser like express.json() already read the body
      body = JSON.stringify(req.body ?? {});
      headers.delete("content-length");
    } else {
      body = Readable.toWeb(req) as ReadableStream;
    }
  }

  return new globalThis.Request(
    new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`),
    { method: req.method, headers, body, duplex: "half" } as RequestInit
  );
};

// ...and stream the web Response back through Express
const sendWebResponse = (res: Response, response: globalThis.Response) => {
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) return res.end();
  Readable.fromWeb(response.body as any).pipe(res);
};

export const puckCloud = express.Router();

puckCloud.use("/api/puck", async (req, res, next) => {
  try {
    sendWebResponse(res, await puckHandler(toWebRequest(req), options));
  } catch (error) {
    next(error);
  }
});
