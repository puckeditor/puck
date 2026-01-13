import App from "./App";
import PuckPage from "./PuckPage";

const normalizePath = (path: string) => {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

export default function Router() {
  const path = normalizePath(window.location.pathname);

  if (path === "/puck") {
    return <PuckPage />;
  }

  return <App />;
}
