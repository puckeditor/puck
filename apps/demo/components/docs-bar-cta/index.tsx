import { ArrowUpRight } from "lucide-react";
import { getClassNameFactory } from "@/core/lib";
import styles from "./styles.module.css";

const gettingStartedUrl = "https://puckeditor.com/docs/getting-started";
const cloudSignUpUrl = "https://cloud.puckeditor.com/sign-up";

const getBarClassName = getClassNameFactory("DemoBar", styles);

/**
 * Renders the CTA bar that points people to Puck's onboarding documentation
 * and to trying Puck Cloud.
 */
export const DocsBarCta = () => (
  <div className={getBarClassName()}>
    You&apos;re using the Puck demo.
    <div className={getBarClassName("links")}>
      <a
        className={getBarClassName("button")}
        href={gettingStartedUrl}
        target="_blank"
        rel="noreferrer"
      >
        Get started
        <ArrowUpRight aria-hidden="true" size={14} />
      </a>
      <a
        className={getBarClassName("link")}
        href={cloudSignUpUrl}
        target="_blank"
        rel="noreferrer"
      >
        Try Puck Cloud
        <ArrowUpRight aria-hidden="true" size={14} />
      </a>
    </div>
  </div>
);
