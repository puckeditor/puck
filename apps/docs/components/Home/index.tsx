import React from "react";

import styles from "./styles.module.css";
import getClassNameFactory from "@/core/lib/get-class-name-factory";
import { Button } from "@/core/components/Button";
import Link from "next/link";
import { CtaCard } from "../CtaCard";

const getClassName = getClassNameFactory("Home", styles);

export const Home = () => {
  return (
    <div className={getClassName()}>
      <div className={getClassName("title")}>
        <h1 style={{ visibility: "hidden" }}>Puck</h1>

        <span>Open-source under MIT</span>
        <h2 className={getClassName("heading")}>The visual editor for React</h2>
      </div>
      <div style={{ paddingTop: 24 }} />
      <div className={getClassName("description")}>
        <p style={{ fontSize: 18, lineHeight: 1.5, opacity: 0.7 }}>
          Puck empowers developers to build amazing visual editing experiences
          into their own React applications, powering the next generation of
          content tools, no-code builders and WYSIWYG editors.
        </p>
      </div>
      <div style={{ paddingTop: 32 }} />
      <div className={getClassName("ctas")}>
        <div className={getClassName("actions")}>
          <Link href="/docs" style={{ display: "flex" }}>
            <Button>Read docs</Button>
          </Link>
          <Button href="https://demo.puckeditor.com/edit" variant="secondary">
            View demo
          </Button>
        </div>
        <div style={{ paddingTop: 32 }} />
        <pre style={{ padding: 0, margin: 0 }}>
          <span style={{ userSelect: "none" }}>~ </span>npm i @measured/puck
          --save
        </pre>
      </div>
      <div className={getClassName("peakWrapper")}>
        <div>
          <div className={getClassName("dot")} />
          <div className={getClassName("dot")} />
          <div className={getClassName("dot")} />
        </div>

        <div className={getClassName("peak")}>
          <CtaCard />
        </div>
      </div>
    </div>
  );
};
