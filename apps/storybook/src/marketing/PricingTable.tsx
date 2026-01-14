import type { CSSProperties } from "react";
import "./marketing.css";

export type PricingPlan = {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  highlighted?: boolean;
};

export type PricingTableProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  plans?: PricingPlan[];
  accent?: string;
};

export default function PricingTable({
  eyebrow = "Pricing",
  title = "Choose your launch plan",
  subtitle = "Pick a plan that matches your release cadence and team size.",
  plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Best for early-stage teams and side projects.",
      features: ["3 live pages", "Shared templates", "Community support"],
      ctaLabel: "Start Starter"
    },
    {
      name: "Growth",
      price: "$79",
      period: "/month",
      description: "For teams shipping weekly campaigns.",
      features: ["Unlimited pages", "Advanced sections", "Priority support"],
      ctaLabel: "Start Growth",
      highlighted: true
    },
    {
      name: "Enterprise",
      price: "Let's talk",
      description: "Custom workflows and security controls.",
      features: ["Design system sync", "SAML + audit", "Dedicated success"],
      ctaLabel: "Contact sales"
    }
  ],
  accent = "#6366f1"
}: PricingTableProps) {
  return (
    <section
      className="mkt mkt-pricing"
      style={{ "--mkt-accent": accent } as CSSProperties}
    >
      <div className="mkt-shell">
        <span className="mkt-eyebrow">{eyebrow}</span>
        <h2 className="mkt-title">{title}</h2>
        <p className="mkt-subtitle">{subtitle}</p>
        <div className="mkt-pricing-grid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`mkt-plan${plan.highlighted ? " mkt-plan--highlight" : ""}`}
            >
              <h3>{plan.name}</h3>
              <div>
                <span className="mkt-price">{plan.price}</span>
                {plan.period && <span>{plan.period}</span>}
              </div>
              {plan.description && <p className="mkt-subtitle">{plan.description}</p>}
              {plan.features && (
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
              <a className="mkt-button mkt-button--primary" href={plan.ctaHref ?? "#"}>
                {plan.ctaLabel ?? "Get started"}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
