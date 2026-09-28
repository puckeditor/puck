import { PuckPage } from "./puck/page";

// Renders the Puck page published at this URL
export default function App() {
  return (
    <PuckPage
      path={window.location.pathname}
      fallback={<h1>Page not found</h1>}
    />
  );
}
