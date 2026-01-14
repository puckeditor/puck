import type { CSSProperties } from "react";
import "./marketing.css";

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatarUrl?: string;
};

export type TestimonialGridProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  testimonials?: Testimonial[];
  accent?: string;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function TestimonialGrid({
  eyebrow = "Customer love",
  title = "Teams rely on the system",
  subtitle = "Launch more often with a layout system built for speed.",
  testimonials = [
    {
      quote:
        "We replaced three separate landing templates with a single modular system and cut launch time in half.",
      name: "Ava Thompson",
      role: "Head of Growth",
      company: "Northwind"
    },
    {
      quote:
        "The design tokens mean our marketing team can build pages without losing brand consistency.",
      name: "Maya Chen",
      role: "Brand Designer",
      company: "Lumen"
    },
    {
      quote:
        "We spin up campaign variants in minutes and the handoff to engineering is seamless.",
      name: "Jordan Lee",
      role: "Product Marketing",
      company: "Arcadia"
    }
  ],
  accent = "#6366f1"
}: TestimonialGridProps) {
  return (
    <section
      className="mkt mkt-testimonials"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell">
        <span className="mkt-eyebrow">{eyebrow}</span>
        <h2 className="mkt-title">{title}</h2>
        <p className="mkt-subtitle">{subtitle}</p>
        <div className="mkt-testimonial-grid">
          {testimonials.map((item, index) => (
            <article className="mkt-quote" key={`${item.name}-${index}`}>
              <p>\"{item.quote}\"</p>
              <div className="mkt-quote__person">
                <span className="mkt-avatar">
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt={item.name} loading="lazy" />
                  ) : (
                    getInitials(item.name)
                  )}
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <div className="mkt-subtitle">
                    {item.role} - {item.company}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
