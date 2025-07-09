import styles from "./styles.module.css";
import getClassNameFactory from "@/core/lib/get-class-name-factory";
import { Button } from "@/core/components/Button";
import { DiscoveryButton } from "../DiscoveryButton";

const getClassName = getClassNameFactory("CtaCard", styles);

export const CtaCard = () => (
  <div className={getClassName()}>
    <h2 className={getClassName("heading")} id="support">
      Stuck with Puck?
    </h2>
    <p>We provide Puck support, design system builds, and consultancy.</p>
    <div className={getClassName("actions")}>
      <DiscoveryButton />
      <Button href="https://discord.gg/D9e4E3MQVZ" variant="secondary" newTab>
        Join Discord — Free
      </Button>
    </div>
  </div>
);
