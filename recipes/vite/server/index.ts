// Puck's APIs, served by Vite in development and by server/prod.ts in production
import fs from "node:fs";
import { Hono } from "hono";
import { puckPages } from "./puck/pages.js";

// Vite doesn't give server code .env.local, which holds PUCK_API_KEY
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const app = new Hono();

app.route("/", puckPages);

export default app;
