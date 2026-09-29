/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ComponentConfig } from "@/core/types";
import { quotes } from "./quotes";
import { AutoField, FieldLabel, RichTextMenu } from "@/core";
import { Link2, Quote } from "lucide-react";
import HeroComponent, { HeroProps } from "./Hero";
import { heroRenderFields } from "./render-fields";
import {
  sectionBackgroundField,
  sectionPaddingField,
} from "../../components/Section";
import { sectionHeaderFields } from "../../components/SectionHeader";

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
    layout: {
      type: "radio",
      options: [
        { label: "Split", value: "split" },
        { label: "Centered", value: "centered" },
        { label: "Cinematic", value: "cinematic" },
        { label: "Browser", value: "browser" },
      ],
      ai: {
        instructions:
          "Use 'split' by default. Use 'cinematic' for visual subjects such as cars, travel, food, fashion or events. Use 'centered' for bold statements. Use 'browser' only for software, apps or websites.",
      },
    },
    eyebrow: sectionHeaderFields.eyebrow,
    title: sectionHeaderFields.title,
    description: {
      ...heroRenderFields.description,
      contentEditable: true,
      ai: {
        instructions:
          "Supporting rich text shown below the title, 30 words or fewer.",
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
    buttons: sectionHeaderFields.buttons,
    highlight: {
      type: "object",
      objectFields: {
        value: { type: "text" },
        label: { type: "text" },
      },
      ai: {
        instructions:
          "Optional fact shown on a card over the photo in the split layout, such as '4.9★' with 'from 2,000 reviews'.",
      },
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
              stream: false,
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
                value={value?.src}
                onChange={(src) => onChange({ ...value, src })}
                readOnly={readOnly}
              />
            </FieldLabel>
          ),
        },
        mode: {
          type: "radio",
          ai: {
            required: false,
            instructions: "Use 'image'. Never use 'custom'.",
          },
          options: [
            { label: "image", value: "image" },
            { label: "custom", value: "custom" },
          ],
        },
      },
    },
    background: {
      ...sectionBackgroundField,
      ai: {
        instructions:
          "Use 'default' unless the page calls for a dark, dramatic hero, then use 'inverse'. The cinematic layout ignores it.",
      },
    },
    padding: sectionPaddingField,
  },
  defaultProps: {
    layout: "split",
    background: "default",
    title: "Hero",
    description: "<p>Description</p>",
    buttons: [{ label: "Learn more", href: "#" }],
    image: {
      source: {
        src: "https://images.unsplash.com/photo-1687204209659-3bded6aecd79?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
        alt: "Hero image",
      },
      mode: "image",
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
  resolveFields: async (data, { fields }) => ({
    ...fields,
    background:
      data.props.layout === "cinematic" ? undefined : fields.background,
    highlight: data.props.layout === "split" ? fields.highlight : undefined,
  }),
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
