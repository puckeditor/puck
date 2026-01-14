import type { CSSProperties } from "react";
import "./marketing.css";

export type StatItem = {
  value: string;
  label: string;
};

export type StatsBandProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  stats?: StatItem[];
  accent?: string;
};

export default function StatsBand({
  eyebrow = "Momentum",
  title = "Performance you can see",
  subtitle = "Every block is optimized for conversion, measured in real time.",
  stats = [
    { value: "3.4x", label: "Faster launch" },
    { value: "92%", label: "Design reuse" },
    { value: "28%", label: "Higher CTR" },
    { value: "11 days", label: "Saved per sprint" }
  ],
  accent = "#6366f1"
}: StatsBandProps) {
  return (
    <section
      className="mkt mkt-stats"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell">
        <span className="mkt-eyebrow">{eyebrow}</span>
        <h2 className="mkt-title">{title}</h2>
        <p className="mkt-subtitle">{subtitle}</p>
        <div className="mkt-stats-grid">
          {stats.map((stat) => (
            <div className="mkt-stat" key={stat.label}>
              <h3>{stat.value}</h3>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
