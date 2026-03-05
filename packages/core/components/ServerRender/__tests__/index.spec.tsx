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
});
