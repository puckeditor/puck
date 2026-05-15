import { ViewsPluginOptions } from "../../../../types";

import { clearQueryCache, getViews, getViewDataByIds } from "..";

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

describe("views service", () => {
  beforeEach(() => {
    clearQueryCache();
    jest.clearAllMocks();
  });

  describe("getResolvedViews", () => {
    it("merges built-in and custom views from root storage", () => {
      const views = getViews({
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
  });

  describe("loadResolvedViewData", () => {
    it("loads resolved view data for shared editor consumers", async () => {
      const fetch = jest.fn(
        async (_params: Record<string, any>, context?: { viewId?: string }) =>
          context?.viewId
      );
      const viewsById = await getViewDataByIds({
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
  });
});
