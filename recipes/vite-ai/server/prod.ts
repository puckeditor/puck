// Serves the built app and Puck's APIs in production
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import api from "./index.js";

const app = new Hono();

app.route("/", api);
app.use("/*", serveStatic({ root: "./dist" }));
// Every other path loads the app, which decides what to render
app.get("*", serveStatic({ path: "./dist/index.html" }));

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
