import "./App.css";

export default function App() {
  return (
    <main className="app">
      <span className="pill">Hello Storybook</span>
      <h1>Vite + Storybook</h1>
      <p>
        This is a fresh Vite app. Open Storybook to explore components in
        isolation.
      </p>
      <div className="actions">
        <a className="primary" href="https://vite.dev" target="_blank" rel="noreferrer">
          Vite Docs
        </a>
        <a className="secondary" href="https://storybook.js.org" target="_blank" rel="noreferrer">
          Storybook Docs
        </a>
      </div>
    </main>
  );
}
