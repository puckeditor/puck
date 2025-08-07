/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { AutoField, Button, createUsePuck, FieldLabel, walkTree } from "@/core";
import { ComponentConfig, ComponentDataOptionalId, Slot } from "@/core/types";
import { withLayout } from "../../components/Layout";
import { generateId } from "@/core/lib/generate-id";
import { componentKey } from "../../index";
import { type Components } from "../../types";
import TemplateComponent, { TemplateProps } from "./Template";

const usePuck = createUsePuck();

async function createComponent<T extends keyof Components>(
  component: T,
  props?: Partial<Components[T]>
): Promise<ComponentDataOptionalId<Components[T]>> {
  const { conf: config } = await import("../../index");

  return {
    type: component,
    props: {
      ...config.components[component].defaultProps,
      ...props,
    },
  } as ComponentDataOptionalId<Components[T]>;
}

type TemplateData = Record<string, { label: string; data: Slot }>;

export const TemplateInternal: ComponentConfig<TemplateProps> = {
  fields: {
    template: {
      type: "custom",
      render: ({ name, value, onChange }) => {
        const templateKey = `puck-demo-templates:${componentKey}`;

        const props = usePuck((s) => s.selectedItem?.props) as
          | TemplateProps
          | undefined;

        const [templates, setTemplates] = useState<TemplateData>(
          JSON.parse(localStorage.getItem(templateKey) ?? "{}")
        );

        return (
          <FieldLabel label={name}>
            <AutoField
              value={value}
              onChange={onChange}
              field={{
                type: "select",
                options: [
                  { label: "Blank", value: "blank" },
                  { label: "Example 1", value: "example_1" },
                  { label: "Example 2", value: "example_2" },
                  ...Object.entries(templates).map(([key, template]) => ({
                    value: key,
                    label: template.label,
                  })),
                ],
              }}
            />
            <div style={{ marginLeft: "auto", marginTop: 16 }}>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!props?.children) {
                    return;
                  }

                  const templateId = generateId();

                  const { conf: config } = await import("../../index");

                  const data = props.children.map((child) =>
                    walkTree(
                      {
                        type: child.type,
                        props: { ...child.props, id: generateId(child.type) },
                      },
                      config,
                      (content) =>
                        content.map((item) => ({
                          ...item,
                          props: { ...item.props, id: generateId(item.type) },
                        }))
                    )
                  );

                  const templateData = {
                    ...templates,
                    [templateId]: {
                      label: new Date().toLocaleString(),
                      data,
                    },
                  };

                  localStorage.setItem(
                    templateKey,
                    JSON.stringify(templateData)
                  );

                  setTemplates(templateData);

                  onChange(templateId);
                }}
              >
                Save new template
              </Button>
            </div>
          </FieldLabel>
        );
      },
    },
    children: {
      type: "slot",
    },
  },
  defaultProps: {
    template: "example_1",
    children: [],
  },
  resolveData: async (data, { changed, trigger }) => {
    if (!changed.template || trigger === "load") return data;

    const templateKey = `puck-demo-templates:${componentKey}`;

    const templates: TemplateData = {
      ...JSON.parse(localStorage.getItem(templateKey) ?? "{}"),
      blank: {
        label: "Blank",
        data: [],
      },
      example_1: {
        label: "Example 1",
        data: [
          await createComponent("Heading", {
            text: "Template example.",
            size: "xl",
          }),
          await createComponent("Text", {
            text: "This component uses the slots API. Try changing template, or saving a new one via the template field.",
          }),
        ],
      },
      example_2: {
        label: "Example 2",
        data: [
          await createComponent("Grid", {
            numColumns: 2,
            items: [
              await createComponent("Card", { title: "A card", mode: "card" }),
              await createComponent("Flex", {
                direction: "column",
                gap: 0,
                items: [
                  await createComponent("Space", {
                    size: "32px",
                  }),
                  await createComponent("Heading", {
                    text: "Template example",
                    size: "xl",
                  }),
                  await createComponent("Text", {
                    text: "Dynamically create components using the new slots API.",
                  }),
                  await createComponent("Space", {
                    size: "16px",
                  }),
                  await createComponent("Button", {
                    variant: "secondary",
                    label: "Learn more",
                  }),
                  await createComponent("Space", {
                    size: "32px",
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    };

    const children =
      templates[data.props.template]?.data || templates["example_1"].data;

    return {
      ...data,
      props: {
        ...data.props,
        children,
      },
    };
  },
  render: TemplateComponent,
};

export const Template = withLayout(TemplateInternal);
