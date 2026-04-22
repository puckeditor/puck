import { ComponentConfig } from "@puckeditor/core";

import { ViewsPluginOptions } from "../../../types";
import { applyNodeViews } from "..";

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

const arrayHeadingConfig: ComponentConfig = {
  fields: {
    arrayField: {
      type: "array",
      arrayFields: {
        title: { type: "text" },
      },
    },
  },
  render: () => null as any,
};

const nestedArrayConfig: ComponentConfig = {
  fields: {
    groups: {
      type: "array",
      defaultItemProps: {
        cards: [],
      },
      arrayFields: {
        cards: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
          },
        },
      },
    },
  },
  render: () => null as any,
};

describe("plugin-views resolvers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("applyNodeViews", () => {
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

    it("applies wildcard templates within a bound array", async () => {
      const wildcardOptions: ViewsPluginOptions = {
        ...options,
        sources: {
          products: {
            fields: {},
            fetch: jest.fn(async () => [
              { name: "Text 1" },
              { name: "Text 2" },
              { name: "Text 3" },
            ]),
          },
        },
      };

      const resolved = await applyNodeViews({
        data: {
          props: {
            id: "Heading-1",
            arrayField: [],
            __puck_view_state: {
              templates: {
                "arrayField[*].title":
                  "Some template {{ topProducts[*].name }}",
              },
              bindings: {
                "arrayField[*]": {
                  viewId: "topProducts",
                  path: "topProducts[*]",
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
        options: wildcardOptions,
        componentConfig: arrayHeadingConfig,
      });

      expect(resolved.props.arrayField).toEqual([
        { title: "Some template Text 1" },
        { title: "Some template Text 2" },
        { title: "Some template Text 3" },
      ]);
    });

    it("applies wildcard templates through nested bound arrays", async () => {
      const nestedOptions: ViewsPluginOptions = {
        ...options,
        builtInViews: [
          {
            id: "groupsView",
            label: "Groups",
            source: "products",
          },
        ],
        sources: {
          products: {
            fields: {},
            fetch: jest.fn(async () => [
              {
                cards: [{ title: "One" }, { title: "Two" }],
              },
              {
                cards: [{ title: "Three" }],
              },
            ]),
          },
        },
      };

      const resolved = await applyNodeViews({
        data: {
          props: {
            id: "Heading-1",
            groups: [],
            __puck_view_state: {
              templates: {
                "groups[*].cards[*].title":
                  "Card {{ groupsView[*].cards[*].title }}",
              },
              bindings: {
                "groups[*]": {
                  viewId: "groupsView",
                  path: "groupsView[*]",
                },
                "groups[*].cards[*]": {
                  viewId: "groupsView",
                  path: "groupsView[*].cards[*]",
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
        options: nestedOptions,
        componentConfig: nestedArrayConfig,
      });

      expect(resolved.props.groups).toEqual([
        {
          cards: [{ title: "Card One" }, { title: "Card Two" }],
        },
        {
          cards: [{ title: "Card Three" }],
        },
      ]);
    });

    it("skips wildcard templates when they do not match the bound wildcard depth", async () => {
      const wildcardOptions: ViewsPluginOptions = {
        ...options,
        sources: {
          products: {
            fields: {},
            fetch: jest.fn(async () => [{ names: [{ value: "Text 1" }] }]),
          },
        },
      };

      const data = {
        props: {
          id: "Heading-1",
          arrayField: [{ title: "Original" }],
          __puck_view_state: {
            templates: {
              "arrayField[*].title":
                "Some template {{ topProducts[*].names[*].value }}",
            },
            bindings: {
              "arrayField[*]": {
                viewId: "topProducts",
                path: "topProducts[*]",
              },
            },
          },
        },
      };

      const resolved = await applyNodeViews({
        data,
        root: {
          type: "root",
          props: {
            id: "root",
          },
        },
        options: wildcardOptions,
        componentConfig: arrayHeadingConfig,
      });

      expect(resolved.props.arrayField).toEqual([{ title: "Original" }]);
    });

    it("resolves wildcard templates stored on a static field path inside a bound array correctly", async () => {
      const wildcardOptions: ViewsPluginOptions = {
        ...options,
        sources: {
          products: {
            fields: {},
            fetch: jest.fn(async () => [
              {
                variants: [{ size: "XS" }, { size: "S" }],
              },
              {
                variants: [{ size: "M" }, { size: "L" }],
              },
            ]),
          },
        },
      };

      const resolved = await applyNodeViews({
        data: {
          props: {
            id: "Heading-1",
            arrayField: [{ title: "" }, { title: "" }],
            __puck_view_state: {
              templates: {
                "arrayField[0].title":
                  "This is {{ topProducts[*].variants[1].size }}",
              },
              bindings: {
                "arrayField[*]": {
                  viewId: "topProducts",
                  path: "topProducts[*]",
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
        options: wildcardOptions,
        componentConfig: arrayHeadingConfig,
      });

      expect(resolved.props.arrayField).toEqual([
        { title: "This is S" },
        { title: "This is L" },
      ]);
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
  });
});
