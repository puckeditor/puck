import { UserData } from "./types";
import { performanceData, performancePath } from "./fixtures/performance";

export const initialData: Record<string, UserData> = {
  "/": {
    content: [
      {
        type: "Hero",
        props: {
          layout: "split",
          background: "default",
          backdrop: "grid",
          padding: "160px",
          eyebrow: "Open-source",
          title: "This page was built with Puck",
          description:
            "<p>Puck is the visual editor for React. Bring your own components and make changes instantly, without a deploy.</p>",
          buttons: [
            {
              label: "Visit GitHub",
              href: "https://github.com/puckeditor/puck",
              variant: "primary",
            },
            {
              label: "Edit this page",
              href: "/edit",
              variant: "secondary",
            },
          ],
          id: "Hero-1687283596554",
          image: {
            source: {
              src: "https://images.unsplash.com/photo-1687204209659-3bded6aecd79?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
              alt: "Aerial view of a city",
            },
            mode: "image",
            content: [],
          },
        },
        readOnly: {
          title: false,
          description: false,
        },
      },
      {
        type: "FeatureGrid",
        props: {
          cards: [
            {
              type: "Card",
              props: {
                id: "Card-0012a293-8ef3-4e7c-9d7c-7da0a03d97ae",
                title: "Integrated by agents",
                description:
                  "Agents and front-end developers can easily build components using a familiar React API.",
                icon: "git-merge",
                mode: "flat",
                layout: {
                  grow: true,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-66ab42c9-d1da-4c44-9dba-5d7d72f2178d",
                title: "Editing with guardrails",
                description:
                  "Puck lets you make safe, controlled changes in production, without breaking the app.",
                icon: "pen-tool",
                mode: "flat",
                layout: {
                  grow: true,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-09efb3f3-f58d-4e07-a481-7238d7e57ad6",
                title: "No vendor lock-in",
                description:
                  "Open-source under MIT, Puck is designed to be integrated into any React application.",
                icon: "github",
                mode: "flat",
                layout: {
                  grow: true,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
          ],
          background: "default",
          backdrop: "none",
          padding: "160px",
          columns: 3,
          title: "Drag-and-drop your own React components",
          description:
            "Configure Puck with your own components to make changes to your app without a developer.",
          id: "FeatureGrid-c4cd99ae-8c5e-4cdb-87d2-35a639f5163e",
          cardMode: "flat",
        },
      },
      {
        type: "Stats",
        props: {
          layout: "split",
          background: "inverse",
          backdrop: "grid",
          padding: "160px",
          title: "Modify any page at /edit",
          description:
            'This page demonstrates Puck configured with a custom component library. This component is called "Stats", and contains some made-up numbers.',
          items: [
            {
              value: "20M+",
              label: "Pages generated",
            },
            {
              value: "$1.5M",
              label: "Cost savings",
            },
            {
              value: "5M",
              label: "Human edits",
            },
            {
              value: "15K",
              label: "Teams",
            },
          ],
          id: "Stats-1687297239724",
          buttons: [],
        },
      },
      {
        type: "FeatureGrid",
        props: {
          cards: [
            {
              type: "Card",
              props: {
                id: "Card-b0e8407d-9fbb-4e76-aa32-d32f655c11d3",
                title: "AI",
                description:
                  "Generate predictable pages with AI that's constrained to your components.",
                icon: "sparkles",
                mode: "card",
                layout: {
                  grow: false,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-9c3b0acc-ee42-4a4a-8cc7-1b22d98493f1",
                title: "Auth (Coming Soon)",
                description:
                  "Add managed authentication with access control, or integrate your own.",
                icon: "lock",
                mode: "card",
                layout: {
                  grow: false,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-88aacee9-ea88-4901-8cd8-3eda97b718e6",
                title: "Assets (Coming Soon)",
                description:
                  "A purpose-built asset store, powered by Cloudflare's best-in-class CDN.",
                icon: "cloud",
                mode: "card",
                layout: {
                  grow: false,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-3de72a90-0ce8-40d9-95e3-e5f8d9143951",
                title: "Branching (Coming Soon)",
                description:
                  "Isolated environments to iterate on your Puck config without breaking production data.",
                icon: "git-merge",
                mode: "card",
                layout: {
                  grow: false,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-b221bbdf-0a41-4741-90e8-98d748e9ee4b",
                title: "Multiplayer (Coming Soon)",
                description:
                  "Bring real-time collaborative editing to your Puck instance.",
                icon: "users",
                mode: "card",
                layout: {
                  grow: false,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
            {
              type: "Card",
              props: {
                id: "Card-f8ebd568-3a30-4099-a068-22cabae4691b",
                title: "Pages (Coming Soon)",
                description:
                  "Store pages with built-in version history and data migration.",
                icon: "book-open",
                mode: "card",
                layout: {
                  grow: false,
                  spanCol: 1,
                  spanRow: 1,
                  padding: "0px",
                },
              },
            },
          ],
          background: "subtle",
          backdrop: "none",
          padding: "160px",
          columns: 3,
          title: "Deploy instantly with Puck Cloud",
          description:
            "A modular, purpose-built backend for Puck, designed to get you into production. Use as much of it as you need.",
          id: "FeatureGrid-2da28e88-7b7b-4152-9da0-9f93f41213b6",
          cardMode: "card",
          buttons: [
            {
              label: "Try Puck Cloud",
              href: "https://cloud.puckeditor.com/sign-up",
              variant: "primary",
            },
          ],
        },
      },
      {
        type: "CTA",
        props: {
          layout: "centered",
          background: "default",
          backdrop: "none",
          padding: "160px",
          title: "Get started",
          description:
            "Browse the Puck GitHub to get started, or try editing this page.",
          buttons: [
            {
              label: "Visit GitHub",
              href: "https://github.com/puckeditor/puck",
              variant: "primary",
            },
            {
              label: "Edit this page",
              href: "/edit",
              variant: "secondary",
            },
          ],
          id: "CTA-d3794e27-5901-4a62-8b09-f74a80ef81ec",
        },
      },
    ],
    root: {
      props: {
        title: "Puck Example",
      },
    },
    zones: {},
  },
  "/pricing": {
    content: [],
    root: { props: { title: "Pricing" } },
  },
  "/about": {
    content: [],
    root: { props: { title: "About Us" } },
  },
};

export const getInitialData = (path: string) => {
  if (path === performancePath) {
    return performanceData;
  }

  return initialData[path] || {};
};
