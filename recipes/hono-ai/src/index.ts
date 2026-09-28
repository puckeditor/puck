import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { puckPages } from "./puck/pages.js";
import { puckCloud } from "./puck/cloud.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/", puckPages);
app.route("/", puckCloud);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
