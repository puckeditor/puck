import { ArrowUpRight } from "lucide-react";
import { getClassNameFactory } from "@/core/lib";
import styles from "./styles.module.css";

const gettingStartedUrl = "https://puckeditor.com/docs/getting-started";

const getBarClassName = getClassNameFactory("DemoBar", styles);

/**
 * Renders the CTA bar that points people to Puck's onboarding documentation.
 */
export const DocsBarCta = () => (
  <div className={getBarClassName()}>
    You&apos;re using the Puck demo.
    <a
      className={getBarClassName("link")}
      href={gettingStartedUrl}
      target="_blank"
      rel="noreferrer"
    >
      Get started
      <ArrowUpRight aria-hidden="true" size={14} />
    </a>
  </div>
);
