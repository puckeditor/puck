import type { Config } from "@puckeditor/core";
import { withViews } from "../../../configure";
import {
  applyNodeViews,
  applyTemplateString,
  collectViewUsageCounts,
  getResolvedViews,
} from "../views";
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

  it("merges built-in and custom views from root storage", () => {
    const views = getResolvedViews({
      root: {
        type: "root",
        props: {
          id: "root",
          __puck_views: {
            custom: [
              {
                id: "customProducts",
                label: "Custom products",
                source: "products",
                params: { category: "all" },
              },
            ],
          },
        },
      },
      builtInViews: options.builtInViews,
    });

    expect(views.map((view) => view.id)).toEqual([
      "topProducts",
      "customProducts",
    ]);
  });

  it("interpolates multiple template expressions", () => {
    expect(
      applyTemplateString({
        template:
          "{{ topProducts[0].name }} costs {{ topProducts[0].price }} credits",
        viewsById: {
          topProducts: [{ name: "Puck Hoodie", price: 68 }],
        },
      })
    ).toBe("Puck Hoodie costs 68 credits");
  });

  it("applies bindings and templates to props", async () => {
    const resolved = await applyNodeViews({
      data: {
        props: {
          title: "Original",
          price: 0,
          __puck_view_state: {
            templates: {
              title: "Featured: {{ topProducts[0].name }}",
            },
            bindings: {
              price: {
                viewId: "topProducts",
                path: "[0].price",
              },
            },
          },
        },
      },
      root: {
        type: "root",
        props: {
          id: "root",
        },
      },
      options,
    });

    expect(resolved.props.title).toBe("Featured: Puck Hoodie");
    expect(resolved.props.price).toBe(68);
    expect(resolved.readOnly?.price).toBe(true);
  });

  it("keeps props unchanged when fetching view data fails", async () => {
    const failingOptions: ViewsPluginOptions = {
      ...options,
      sources: {
        products: {
          fields: {},
          fetch: jest.fn(async () => {
            throw new Error("Nope");
          }),
        },
      },
    };
    const data = {
      props: {
        title: "Original",
        __puck_view_state: {
          templates: {
            title: "Featured: {{ topProducts[0].name }}",
          },
          bindings: {},
        },
      },
    };

    expect(
      await applyNodeViews({
        data,
        root: {
          type: "root",
          props: {
            id: "root",
          },
        },
        options: failingOptions,
      })
    ).toEqual(data);
  });

  it("counts template and binding usage", () => {
    const config: Config = {
      components: {
        TextBlock: {
          fields: {},
          render: () => <div />,
        },
      },
    };

    const counts = collectViewUsageCounts({
      data: {
        root: {
          props: {
            __puck_view_state: {
              templates: {
                title: "{{ topProducts[0].name }}",
              },
              bindings: {},
            },
          },
        },
        content: [
          {
            type: "TextBlock",
            props: {
              id: "Text-1",
              __puck_view_state: {
                templates: {},
                bindings: {
                  text: {
                    viewId: "topProducts",
                    path: "[0].name",
                  },
                },
              },
            },
          },
        ],
      },
      config,
    });

    expect(counts.topProducts).toBe(2);
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
          render: () => <div />,
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
      },
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
