/* eslint-disable @next/next/no-img-element */
import React from "react";
import { ComponentConfig } from "@/core/types";
import { quotes } from "./quotes";
import { AutoField, FieldLabel, RichTextMenu } from "@/core";
import { Link2, Quote } from "lucide-react";
import HeroComponent, { HeroProps } from "./Hero";

export const Hero: ComponentConfig<{
  props: HeroProps;
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}> = {
  fields: {
    quote: {
      type: "external",
      placeholder: "Select a quote",
      showSearch: false,
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
      type: "richtext",
      contentEditable: true,
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
        href: { type: "text" },
        variant: {
          type: "select",
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
      options: [
        { label: "left", value: "left" },
        { label: "center", value: "center" },
      ],
    },
    image: {
      type: "object",
      objectFields: {
        content: { type: "slot" },
        url: {
          type: "custom",
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
          options: [
            { label: "inline", value: "inline" },
            { label: "bg", value: "background" },
            { label: "custom", value: "custom" },
          ],
        },
      },
    },
    padding: { type: "userField", option: true },
  },
  defaultProps: {
    title: "Hero",
    align: "left",
    description: "<p>Description</p>",
    buttons: [{ label: "Learn more", href: "#" }],
    padding: "64px",
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
