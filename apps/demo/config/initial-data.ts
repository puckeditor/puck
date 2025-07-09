import { UserData } from "./types";

export const initialData: Record<string, UserData> = {
  "/": {
    content: [
      {
        type: "Hero",
        props: {
          title: "This page was built with Puck",
          description:
            "Puck is the self-hosted visual editor for React. Bring your own components and make site changes instantly, without a deploy.",
          buttons: [
            {
              label: "Visit GitHub",
              href: "https://github.com/measuredco/puck",
            },
            { label: "Edit this page", href: "/edit", variant: "secondary" },
          ],
          id: "Hero-1687283596554",
          image: {
            url: "https://images.unsplash.com/photo-1687204209659-3bded6aecd79?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
            mode: "inline",
            content: [],
          },
          padding: "128px",
          align: "left",
        },
        readOnly: { title: false, description: false },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687298109536",
          direction: "vertical",
        },
      },
      {
        type: "Heading",
        props: {
          align: "center",
          level: "2",
          text: "Drag-and-drop your own React components",
          layout: { padding: "0px" },
          size: "xxl",
          id: "Heading-1687297593514",
        },
      },
      {
        type: "Space",
        props: {
          size: "8px",
          id: "Space-1687284122744",
          direction: "vertical",
        },
      },
      {
        type: "Text",
        props: {
          align: "center",
          text: "Configure Puck with your own components to make change for your marketing pages without a developer.",
          layout: { padding: "0px" },
          size: "m",
          id: "Text-1687297621556",
          color: "muted",
        },
      },
      {
        type: "Space",
        props: {
          size: "40px",
          id: "Space-1687296179388",
          direction: "vertical",
        },
      },
      {
        type: "Grid",
        props: {
          id: "Grid-c4cd99ae-8c5e-4cdb-87d2-35a639f5163e",
          gap: 24,
          numColumns: 3,
          items: [
            {
              type: "Card",
              props: {
                title: "Built for content teams",
                description:
                  "Puck enables content teams to make changes to their content without a developer or breaking the UI.",
                icon: "pen-tool",
                mode: "flat",
                layout: { grow: true, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-66ab42c9-d1da-4c44-9dba-5d7d72f2178d",
              },
            },
            {
              type: "Card",
              props: {
                title: "Easy to integrate",
                description:
                  "Front-end developers can easily integrate their own components using a familiar React API.",
                icon: "git-merge",
                mode: "flat",
                layout: { grow: true, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-0012a293-8ef3-4e7c-9d7c-7da0a03d97ae",
              },
            },
            {
              type: "Card",
              props: {
                title: "No vendor lock-in",
                description:
                  "Completely open-source, Puck is designed to be integrated into your existing React application.",
                icon: "github",
                mode: "flat",
                layout: { grow: true, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-09efb3f3-f58d-4e07-a481-7238d7e57ad6",
              },
            },
          ],
        },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687287070296",
          direction: "vertical",
        },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687298110602",
          direction: "vertical",
        },
      },
      {
        type: "Heading",
        props: {
          align: "center",
          level: "2",
          text: "The numbers",
          layout: { padding: "0px" },
          size: "xxl",
          id: "Heading-1687296574110",
        },
      },
      {
        type: "Space",
        props: {
          size: "16px",
          id: "Space-1687284283005",
          direction: "vertical",
        },
      },
      {
        type: "Text",
        props: {
          align: "center",
          text: 'This page demonstrates Puck configured with a custom component library. This component is called "Stats", and contains some made-up numbers. You can configure any page by adding "/edit" onto the URL.',
          layout: { padding: "0px" },
          size: "m",
          id: "Text-1687284565722",
          color: "muted",
          maxWidth: "916px",
        },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687297618253",
          direction: "vertical",
        },
      },
      {
        type: "Stats",
        props: {
          items: [
            { title: "Users reached", description: "20M+" },
            { title: "Cost savings", description: "$1.5M" },
            { title: "Another stat", description: "5M kg" },
            { title: "Final fake stat", description: "15K" },
          ],
          id: "Stats-1687297239724",
        },
      },
      {
        type: "Space",
        props: {
          size: "120px",
          id: "Space-1687297589663",
          direction: "vertical",
        },
      },
      {
        type: "Heading",
        props: {
          align: "center",
          level: "2",
          text: "Extending Puck",
          layout: { padding: "0px" },
          size: "xxl",
          id: "Heading-1687296184321",
        },
      },
      {
        type: "Space",
        props: {
          size: "8px",
          id: "Space-1687296602860",
          direction: "vertical",
        },
      },
      {
        type: "Text",
        props: {
          align: "center",
          text: "Puck can also be extended with plugins and headless CMS content fields, transforming Puck into the perfect tool for your Content Ops.",
          layout: { padding: "0px" },
          size: "m",
          id: "Text-1687296579834",
          color: "muted",
          maxWidth: "916px",
        },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687299311382",
          direction: "vertical",
        },
      },
      {
        type: "Grid",
        props: {
          gap: 24,
          numColumns: 3,
          id: "Grid-2da28e88-7b7b-4152-9da0-9f93f41213b6",
          items: [
            {
              type: "Card",
              props: {
                title: "plugin-heading-analyzer",
                description:
                  "Analyze the document structure and identify WCAG 2.1 issues with your heading hierarchy.",
                icon: "align-left",
                mode: "card",
                layout: { grow: false, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-b0e8407d-9fbb-4e76-aa32-d32f655c11d3",
              },
            },
            {
              type: "Card",
              props: {
                title: "External data",
                description:
                  "Connect your components with an existing data source, like Strapi.js.",
                icon: "feather",
                mode: "card",
                layout: { grow: false, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-f8ebd568-3a30-4099-a068-22cabae4691b",
              },
            },
            {
              type: "Card",
              props: {
                title: "Custom plugins",
                description:
                  "Create your own plugin to extend Puck for your use case using React.",
                icon: "plug",
                mode: "card",
                layout: { grow: false, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-9c3b0acc-ee42-4a4a-8cc7-1b22d98493f1",
              },
            },
            {
              type: "Card",
              props: {
                title: "Title",
                description: "Description",
                icon: "Feather",
                mode: "card",
                layout: { grow: false, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-dbec4ae9-8208-49bf-8910-3347ff13d957",
              },
            },
            {
              type: "Card",
              props: {
                title: "Title",
                description: "Description",
                icon: "Feather",
                mode: "card",
                layout: { grow: false, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-e807464c-4974-4dbb-b1c9-989deabce58d",
              },
            },
            {
              type: "Card",
              props: {
                title: "Title",
                description: "Description",
                icon: "Feather",
                mode: "card",
                layout: { grow: false, spanCol: 1, spanRow: 1, padding: "0px" },
                id: "Card-3b4b7d53-2124-4d7a-a67e-36b24fd765b4",
              },
            },
          ],
        },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687299315421",
          direction: "vertical",
        },
      },
      {
        type: "Heading",
        props: {
          align: "center",
          level: "2",
          text: "Get started",
          layout: { padding: "0px" },
          size: "xxl",
          id: "Heading-1687299303766",
        },
      },
      {
        type: "Space",
        props: {
          size: "16px",
          id: "Space-1687299318902",
          direction: "vertical",
        },
      },
      {
        type: "Text",
        props: {
          align: "center",
          text: "Browse the Puck GitHub to get started, or try editing this page",
          layout: { padding: "0px" },
          size: "m",
          id: "Text-1687299305686",
          color: "muted",
        },
      },
      {
        type: "Space",
        props: {
          size: "24px",
          id: "Space-1687299335149",
          direction: "vertical",
        },
      },
      {
        type: "Flex",
        props: {
          justifyContent: "center",
          direction: "row",
          gap: 24,
          wrap: "wrap",
          layout: { spanCol: 1, spanRow: 1, padding: "0px" },
          id: "Flex-7d63d5ff-bd42-4354-b05d-681b16436fd6",
          items: [
            {
              type: "Button",
              props: {
                label: "Visit GitHub",
                href: "https://github.com/measuredco/puck",
                variant: "primary",
                id: "Button-bd41007c-6627-414d-839a-e261d470d8f9",
              },
            },
            {
              type: "Button",
              props: {
                label: "Edit this page",
                href: "/edit",
                variant: "secondary",
                id: "Button-6a5fa26c-8a2d-4b08-a756-c46079877127",
              },
            },
          ],
        },
      },
      {
        type: "Space",
        props: {
          size: "96px",
          id: "Space-1687284290127",
          direction: "vertical",
        },
      },
    ],
    root: { props: { title: "Puck Example" } },
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
