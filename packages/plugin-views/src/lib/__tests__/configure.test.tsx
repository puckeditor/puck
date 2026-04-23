import type { Config } from "@puckeditor/core";

import { withViews } from "../../../configure";
import type { ViewsPluginOptions } from "../../types";

const options: ViewsPluginOptions = {
  builtInViews: [
    {
      id: "topProducts",
      label: "Top products",
      source: "products",
      params: {
        category: "all",
      },
    },
  ],
  sources: {
    products: {
      fields: {},
      fetch: jest.fn(async () => [
        {
          name: "Puck Hoodie",
          price: 68,
        },
      ]),
    },
  },
};

describe("plugin-views runtime", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("composes with existing resolveData before applying views", async () => {
    const config: Config = {
      components: {
        Heading: {
          fields: {
            title: { type: "text" },
          },
          resolveData: async ({ props }) => ({
            props: {
              ...props,
              eyebrow: "Existing resolver",
            },
          }),
          render: () => null as any,
        },
      },
    };
    const wrapped = withViews(config, options);
    const resolveData = wrapped.components.Heading.resolveData!;

    const resolved = await resolveData(
      {
        props: {
          id: "Heading-1",
          title: "Original",
          __puck_view_state: {
            templates: {
              title: "Featured: {{ topProducts[0].name }}",
            },
            bindings: {},
          },
        },
      } as any,
      {
        changed: {},
        lastData: null,
        metadata: {},
        trigger: "force",
        parent: null,
        root: {
          type: "root",
          props: { id: "root" },
        },
      }
    );

    expect(resolved.props?.title).toBe("Featured: Puck Hoodie");
    expect(resolved.props?.eyebrow).toBe("Existing resolver");
  });
});
