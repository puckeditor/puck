import { renderToString } from "react-dom/server.node";
import { Config, Data } from "../../../types";
import { Render } from "../index";

describe("ServerRender", () => {
  it("renders richtext content in dropzones as HTML in RSC mode", () => {
    const config: Config = {
      components: {
        Section: {
          fields: {},
          render: ({ puck }) => (
            <div>{puck.renderDropZone({ zone: "content" })}</div>
          ),
        },
        RichText: {
          fields: {
            content: { type: "richtext" },
          },
          render: ({ content }) => <div>{content}</div>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [{ type: "Section", props: { id: "section-1" } }],
      zones: {
        "section-1:content": [
          {
            type: "RichText",
            props: {
              id: "richtext-1",
              content: "<p>Hello world</p>",
            },
          },
        ],
      },
    };

    const html = renderToString(<Render config={config} data={data} />);

    expect(html).toContain("<p>Hello world</p>");
    expect(html).not.toContain("&lt;p&gt;Hello world&lt;/p&gt;");
  });

  it("renders richtext and slot content when server config keeps render fields", () => {
    const config: Config = {
      components: {
        Hero: {
          fields: {
            description: { type: "richtext" },
            image: {
              type: "object",
              objectFields: {
                content: { type: "slot" },
              },
            },
          },
          render: ({ description, image }) => (
            <section>
              <div>{description}</div>
              {image?.content ? <image.content /> : null}
            </section>
          ),
        },
        Heading: {
          fields: {
            title: { type: "text" },
          },
          render: ({ title }) => <h2>{title}</h2>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "Hero",
          props: {
            id: "hero-1",
            description: "<p>Hello <strong>world</strong></p>",
            image: {
              content: [
                {
                  type: "Heading",
                  props: {
                    id: "heading-1",
                    title: "Nested heading",
                  },
                },
              ],
            },
          },
        },
      ],
    };

    const html = renderToString(<Render config={config} data={data} />);

    expect(html).toContain("<p>Hello <strong>world</strong></p>");
    expect(html).toContain("<h2>Nested heading</h2>");
    expect(html).not.toContain("&lt;p&gt;Hello");
  });
});
