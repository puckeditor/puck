import type { CSSProperties } from "react";
import "./marketing.css";

export type CTASectionProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  accent?: string;
};

export default function CTASection({
  eyebrow = "Launch now",
  title = "Ready to create your next campaign?",
  subtitle = "Bring your team into a workspace that keeps everyone on brand and on schedule.",
  primaryLabel = "Start building",
  primaryHref = "#",
  secondaryLabel = "Talk to sales",
  secondaryHref = "#",
  accent = "#6366f1"
}: CTASectionProps) {
  return (
    <section
      className="mkt mkt-cta"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell">
        <span className="mkt-eyebrow">{eyebrow}</span>
        <h2 className="mkt-title">{title}</h2>
        <p className="mkt-subtitle">{subtitle}</p>
        <div className="mkt-actions">
          <a className="mkt-button mkt-button--primary" href={primaryHref}>
            {primaryLabel}
          </a>
          <a className="mkt-button mkt-button--secondary" href={secondaryHref}>
            {secondaryLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
