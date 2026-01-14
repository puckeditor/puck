import type { CSSProperties } from "react";
import "./marketing.css";

export type HeroSplitProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  imageUrl?: string;
  imageAlt?: string;
  accent?: string;
};

export default function HeroSplit({
  eyebrow = "Modern launch kit",
  title = "Ship your next campaign in days, not weeks.",
  subtitle =
    "Reusable blocks, polished typography, and a design system that stays cohesive across every landing page.",
  badge = "New release",
  primaryLabel = "Start a project",
  primaryHref = "#",
  secondaryLabel = "View components",
  secondaryHref = "#",
  imageUrl = "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80",
  imageAlt = "Modern workspace",
  accent = "#6366f1"
}: HeroSplitProps) {
  return (
    <section
      className="mkt mkt-hero"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell mkt-hero__grid">
        <div className="mkt-hero__copy">
          <span className="mkt-eyebrow">{eyebrow}</span>
          <span className="mkt-badge">{badge}</span>
          <h1 className="mkt-title">{title}</h1>
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
        <div className="mkt-hero__image">
          <img src={imageUrl} alt={imageAlt} loading="lazy" />
        </div>
      </div>
    </section>
  );
}
