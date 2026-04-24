"use client";

import { Puck } from "../../../../packages/core/dist/index.mjs";
import type { ReactNode } from "react";

const config = {
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
        title: "Runtime CSS clean route",
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
        body: "This route uses a literal config and imports the built core dist entry so source-mode CSS modules do not affect the iframe style-sync test.",
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
        title: "Runtime CSS clean route",
      },
    },
    {
      type: "ParagraphBlock",
      props: {
        id: "paragraph-block",
        body: "Use ?syncStyles=false to disable host style mirroring and ?uiStyles=false to disable runtime editor style injection. This route is intended to validate the packaged runtime behavior, not source-mode development imports.",
      },
    },
  ],
};

export default function Client() {
  const params =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URL(window.location.href).searchParams;

  const syncStyles = params.get("syncStyles") !== "false";
  const uiStyles = params.get("uiStyles") === "false" ? false : undefined;

  return (
    <Puck
      config={config}
      data={data}
      headerTitle="Runtime CSS clean test"
      onPublish={() => {}}
      height="100vh"
      iframe={{
        enabled: true,
        syncStyles,
      }}
      uiStyles={uiStyles}
    />
  );
}
