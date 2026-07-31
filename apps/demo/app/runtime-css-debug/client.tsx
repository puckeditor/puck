"use client";

import { Puck } from "@/core-dist";
import type { ReactNode } from "react";

const config: any = {
  root: {
    render: ({ children }: { children: ReactNode }) => (
      <main
        style={{
          margin: "0 auto",
          maxWidth: 720,
          padding: "48px 24px 96px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {children}
      </main>
    ),
  },
  components: {
    HeadingBlock: {
      fields: {
        title: {
          type: "text",
        },
      },
      defaultProps: {
        title: "Runtime CSS debug",
      },
      render: ({ title }: { title: string }) => (
        <h1 style={{ fontSize: 40, lineHeight: 1.1, marginBottom: 16 }}>
          {title}
        </h1>
      ),
    },
    ParagraphBlock: {
      fields: {
        body: {
          type: "textarea",
        },
      },
      defaultProps: {
        body: "This route uses runtime CSS importing, and must be rendered from a compiled bundle.",
      },
      render: ({ body }: { body: string }) => (
        <p style={{ fontSize: 18, lineHeight: 1.6 }}>{body}</p>
      ),
    },
  },
};

const data = {
  root: {
    props: {},
  },
  content: [
    {
      type: "HeadingBlock",
      props: {
        id: "heading-block",
        title: "Runtime CSS debug",
      },
    },
    {
      type: "ParagraphBlock",
      props: {
        id: "paragraph-block",
        body: "Use ?syncHostStyles=false to disable host style mirroring.",
      },
    },
  ],
};

export default function Client() {
  const params =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URL(window.location.href).searchParams;

  const syncHostStyles = params.get("syncHostStyles") !== "false";

  return (
    <Puck
      config={config}
      data={data}
      headerTitle="Runtime CSS clean test"
      onPublish={() => {}}
      height="100vh"
      iframe={{
        syncHostStyles,
      }}
    />
  );
}
