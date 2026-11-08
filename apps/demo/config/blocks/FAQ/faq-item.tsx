"use client";

import { memo, useRef, useEffect } from "react";
import { Plus } from "lucide-react";

import { registerOverlayPortal } from "@/core";
import { getClassNameFactory } from "@/core/lib";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("FAQ", styles);

type FAQItemProps = {
  /** The question text for the FAQ item */
  question: string;
  /** The answer text for the FAQ item */
  answer: string;
};

const FAQItemImpl = ({ question, answer }: FAQItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => registerOverlayPortal(itemRef.current), []);

  return (
    <details className={getClassName("item")}>
      <summary ref={itemRef} className={getClassName("question")}>
        {question}
        <Plus className={getClassName("icon")} aria-hidden />
      </summary>
      <div className={getClassName("answer")}>{answer}</div>
    </details>
  );
};

/**
 * Renders an FAQ collapsible item
 */
const FAQItem = memo(FAQItemImpl);

export default FAQItem;
