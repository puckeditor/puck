import React from "react";
import ReactDOM from "react-dom/client";
import Router from "./Router";
import "./index.css";

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Router />
    </React.StrictMode>
  );
}
