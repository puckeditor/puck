import type { CSSProperties } from "react";
import "./App.css";

export type AppProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  puckLabel?: string;
  primaryHref?: string;
  secondaryHref?: string;
  puckHref?: string;
  accent?: string;
};

export default function App({
  eyebrow = "Hello Storybook",
  title = "Vite + Storybook",
  description = "This is a fresh Vite app. Open Storybook to explore components in isolation.",
  primaryLabel = "Vite Docs",
  secondaryLabel = "Storybook Docs",
  puckLabel = "Open Puck",
  primaryHref = "https://vite.dev",
  secondaryHref = "https://storybook.js.org",
  puckHref = "/puck",
  accent = "#f97316"
}: AppProps) {
  return (
    <div className="home">
      <main className="app" style={{ "--accent": accent } as CSSProperties}>
        <span className="pill">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="actions">
          <a
            className="primary"
            href={primaryHref}
            target="_blank"
            rel="noreferrer"
          >
            {primaryLabel}
          </a>
          <a
            className="secondary"
            href={secondaryHref}
            target="_blank"
            rel="noreferrer"
          >
            {secondaryLabel}
          </a>
          <a className="tertiary" href={puckHref}>
            {puckLabel}
          </a>
        </div>
      </main>
    </div>
  );
}
