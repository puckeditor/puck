import type { CSSProperties } from "react";
import "./marketing.css";

export type LogoItem = {
  name: string;
};

export type LogoCloudProps = {
  title?: string;
  subtitle?: string;
  logos?: LogoItem[];
  accent?: string;
};

export default function LogoCloud({
  title = "Trusted by modern teams",
  subtitle = "From ambitious startups to global enterprises.",
  logos = [
    { name: "Northwind" },
    { name: "Lumen" },
    { name: "Arcadia" },
    { name: "Fable" },
    { name: "Keystone" },
    { name: "Cascade" }
  ],
  accent = "#6366f1"
}: LogoCloudProps) {
  return (
    <section
      className="mkt mkt-logo-cloud"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell">
        <h2 className="mkt-title">{title}</h2>
        <p className="mkt-subtitle">{subtitle}</p>
        <div className="mkt-logos">
          {logos.map((logo) => (
            <span className="mkt-logo-pill" key={logo.name}>
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
