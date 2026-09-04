export function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div>
        <h1>404</h1>
        <p>No page in config/pages.ts or local storage for this path</p>
      </div>
    </div>
  );
}

export default NotFound;
