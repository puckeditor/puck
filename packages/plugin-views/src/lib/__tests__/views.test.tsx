import type { ComponentConfig, Config } from "@puckeditor/core";
import { withViews } from "../../../configure";
import {
  applyNodeViews,
  applyTemplateString,
  clearQueryCache,
  collectViewUsageCounts,
  getResolvedViews,
  loadResolvedViewData,
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

const headingConfig: ComponentConfig = {
  fields: {
    title: { type: "text" },
    price: { type: "number" },
  },
  render: () => null as any,
};

describe("plugin-views runtime", () => {
  beforeEach(() => {
    clearQueryCache();
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
          id: "Heading-1",
          title: "Original",
          price: 0,
          __puck_view_state: {
            templates: {
              title: "Featured: {{ topProducts[0].name }}",
            },
            bindings: {
              price: {
                viewId: "topProducts",
                path: "topProducts[0].price",
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
      componentConfig: headingConfig,
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
        id: "Heading-1",
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
        componentConfig: headingConfig,
      })
    ).toEqual(data);
  });

  it("keeps props unchanged when a referenced view is missing", async () => {
    const data = {
      props: {
        id: "Heading-1",
        title: "Original",
        __puck_view_state: {
          templates: {
            title: "Featured: {{ missingProducts[0].name }}",
          },
          bindings: {},
        },
      },
      readOnly: {},
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
        options,
        componentConfig: headingConfig,
      })
    ).toEqual(data);

    expect(options.sources.products.fetch).not.toHaveBeenCalled();
  });

  it("loads resolved view data for shared editor consumers", async () => {
    const fetch = jest.fn(
      async (_params: Record<string, any>, context?: { viewId?: string }) =>
        context?.viewId
    );
    const viewsById = await loadResolvedViewData({
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
      options: {
        ...options,
        sources: {
          products: {
            fields: {},
            fetch,
          },
        },
      },
    });

    expect(viewsById).toEqual({
      topProducts: "topProducts",
      customProducts: "customProducts",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("counts template and binding usage", () => {
    const config: Config = {
      components: {
        TextBlock: {
          fields: {},
          render: () => null as any,
        },
      },
    };

    const counts = collectViewUsageCounts({
      data: {
        root: {
          props: {
            id: "root",
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
                    path: "topProducts[0].name",
                  },
                },
              },
            },
          },
        ],
      } as any,
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
