/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ComponentConfig } from "@/core/types";
import { quotes } from "./quotes";
import { AutoField, FieldLabel, RichTextMenu } from "@/core";
import { Link2, Quote } from "lucide-react";
import HeroComponent, { HeroProps } from "./Hero";
import { heroRenderFields } from "./render-fields";

export const Hero: ComponentConfig<{
  props: HeroProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  ai: {
    instructions: "A page hero whose title renders as the page's h1.",
  },
  fields: {
    quote: {
      type: "external",
      placeholder: "Select a quote",
      showSearch: false,
      ai: { exclude: true },
      renderFooter: ({ items }) => {
        return (
          <div>
            {items.length} result{items.length === 1 ? "" : "s"}
          </div>
        );
      },
      filterFields: {
        author: {
          type: "select",
          options: [
            { value: "", label: "Select an author" },
            { value: "Mark Twain", label: "Mark Twain" },
            { value: "Henry Ford", label: "Henry Ford" },
            { value: "Kurt Vonnegut", label: "Kurt Vonnegut" },
            { value: "Andrew Carnegie", label: "Andrew Carnegie" },
            { value: "C. S. Lewis", label: "C. S. Lewis" },
            { value: "Confucius", label: "Confucius" },
            { value: "Eleanor Roosevelt", label: "Eleanor Roosevelt" },
            { value: "Samuel Ullman", label: "Samuel Ullman" },
          ],
        },
      },
      fetchList: async ({ query, filters }) => {
        // Simulate delay
        await new Promise((res) => setTimeout(res, 500));

        return quotes
          .map((quote, idx) => ({
            index: idx,
            title: quote.author,
            description: quote.content,
          }))
          .filter((item) => {
            if (filters?.author && item.title !== filters?.author) {
              return false;
            }

            if (!query) return true;

            const queryLowercase = query.toLowerCase();

            if (item.title.toLowerCase().indexOf(queryLowercase) > -1) {
              return true;
            }

            if (item.description.toLowerCase().indexOf(queryLowercase) > -1) {
              return true;
            }
          });
      },
      mapRow: (item) => ({
        title: item.title,
        description: <span>{item.description}</span>,
      }),
      mapProp: (result) => {
        return { index: result.index, label: result.description };
      },
      getItemSummary: (item) => item.label,
    },
    title: { type: "text", contentEditable: true },
    description: {
      ...heroRenderFields.description,
      contentEditable: true,
      ai: {
        instructions: "Supporting rich text shown below the Hero title.",
      },
      options: {
        heading: false,
        textAlign: false,
      },
      renderMenu: ({ editor, editorState }) => {
        return (
          <RichTextMenu>
            <RichTextMenu.Group>
              <RichTextMenu.Bold />
              <RichTextMenu.Italic />
              <RichTextMenu.Underline />
            </RichTextMenu.Group>
            <RichTextMenu.Group>
              <RichTextMenu.ListSelect />
              <RichTextMenu.Control
                icon={<Quote />}
                title="Quote"
                active={editorState?.isBlockquote}
                onClick={() => {
                  editor?.chain().focus().toggleBlockquote().run();
                }}
              />
            </RichTextMenu.Group>
          </RichTextMenu>
        );
      },
    },
    buttons: {
      type: "array",
      min: 1,
      max: 4,
      getItemSummary: (item) => item.label || "Button",
      arrayFields: {
        label: { type: "text", contentEditable: true },
        href: {
          type: "text",
          ai: {
            instructions:
              "Use a URL supplied by the user or verified in the business context. Otherwise, use '#'.",
          },
        },
        variant: {
          type: "select",
          ai: {
            instructions:
              "Use 'primary' for the main action in a group and 'secondary' for supporting actions.",
          },
          options: [
            { label: "primary", value: "primary" },
            { label: "secondary", value: "secondary" },
          ],
        },
      },
      defaultItemProps: {
        label: "Button",
        href: "#",
      },
    },
    align: {
      type: "radio",
      ai: {
        instructions:
          "Use 'left' to show the image. Use 'center' to center the text and hide the image.",
      },
      options: [
        { label: "left", value: "left" },
        { label: "center", value: "center" },
      ],
    },
    image: {
      ...heroRenderFields.image,
      objectFields: {
        ...heroRenderFields.image.objectFields,
        source: {
          type: "custom",
          ai: {
            bind: "puck:unsplash",
            schema: {
              type: "object",
              properties: { src: { type: "string" }, alt: { type: "string" } },
            },
          },
          render: ({ value, field, name, onChange, readOnly }) => (
            <FieldLabel
              label={field.label || name}
              readOnly={readOnly}
              icon={<Link2 size="16" />}
            >
              <AutoField
                field={{ type: "text" }}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
              />
            </FieldLabel>
          ),
        },
        mode: {
          type: "radio",
          ai: {
            instructions:
              "Use 'inline' to display the image beside the text or 'background' to place it behind the content. NEVER use 'custom'.",
          },
          options: [
            { label: "inline", value: "inline" },
            { label: "bg", value: "background" },
            { label: "custom", value: "custom" },
          ],
        },
      },
    },
    padding: {
      type: "userField",
      option: true,
      ai: {
        instructions: "Vertical padding above and below the Hero content.",
        schema: { type: "string", pattern: "^\\d+(px|em|rem|%)$" },
      },
    },
  },
  defaultProps: {
    title: "Hero",
    align: "left",
    description: "<p>Description</p>",
    buttons: [{ label: "Learn more", href: "#" }],
    padding: "64px",
    image: {
      source: {
        src: "https://images.unsplash.com/photo-1687204209659-3bded6aecd79?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
        alt: "Hero image",
      },
      mode: "inline",
    },
  },
  /**
   * The resolveData method allows us to modify component data after being
   * set by the user.
   *
   * It is called after the page data is changed, but before a component
   * is rendered. This allows us to make dynamic changes to the props
   * without storing the data in Puck.
   *
   * For example, requesting a third-party API for the latest content.
   */
  resolveData: async ({ props }, { changed }) => {
    if (!props.quote)
      return { props, readOnly: { title: false, description: false } };

    if (!changed.quote) {
      return { props };
    }

    // Simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      props: {
        title: quotes[props.quote.index].author,
        description: `<p>${quotes[props.quote.index].content}</p>`,
      },
      readOnly: { title: true, description: true },
    };
  },
  resolveFields: async (data, { fields }) => {
    if (data.props.align === "center") {
      return {
        ...fields,
        image: undefined,
      };
    }

    return fields;
  },
  resolvePermissions: async (data, params) => {
    if (!params.changed.quote) return params.lastPermissions;

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      ...params.permissions,
      // Disable delete if quote 7 is selected
      delete: data.props.quote?.index !== 7,
    };
  },
  render: HeroComponent,
};
