import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { PuckRoot } from "./puck/root";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PuckRoot>
      <App />
    </PuckRoot>
  </StrictMode>
);
