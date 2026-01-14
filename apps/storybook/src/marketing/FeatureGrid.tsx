import type { CSSProperties } from "react";
import "./marketing.css";

export type FeatureItem = {
  title: string;
  description: string;
  icon?: string;
};

export type FeatureGridProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  features?: FeatureItem[];
  accent?: string;
};

export default function FeatureGrid({
  eyebrow = "Built for teams",
  title = "Everything you need to launch",
  subtitle =
    "From layout primitives to rich data blocks, every section is responsive and easy to customize.",
  features = [
    {
      title: "Composable sections",
      description: "Stack hero, proof, and pricing blocks without writing layout code.",
      icon: "01"
    },
    {
      title: "Design tokens",
      description: "Keep colors, spacing, and type perfectly consistent across pages.",
      icon: "02"
    },
    {
      title: "Fast publishing",
      description: "Ship instantly with versioned presets and shared templates.",
      icon: "03"
    },
    {
      title: "Flexible content",
      description: "Swap text, CTAs, and media per campaign without rebuilding.",
      icon: "04"
    }
  ],
  accent = "#6366f1"
}: FeatureGridProps) {
  return (
    <section
      className="mkt mkt-feature-grid"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell">
        <span className="mkt-eyebrow">{eyebrow}</span>
        <h2 className="mkt-title">{title}</h2>
        <p className="mkt-subtitle">{subtitle}</p>
        <div className="mkt-features">
          {features.map((feature, index) => (
            <article className="mkt-card" key={`${feature.title}-${index}`}>
              <span className="mkt-badge">{feature.icon ?? "*"}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
