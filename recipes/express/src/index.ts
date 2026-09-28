import express from "express";
import { puckPages } from "./puck/pages.js";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello Express!");
});

app.use(puckPages);

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
