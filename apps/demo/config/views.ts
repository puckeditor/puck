import type { BuiltInView, ViewSources, ViewsPluginOptions } from "@/plugin-views";

const products = [
  {
    name: "Puck Hoodie",
    category: "apparel",
    price: 68,
    rating: 4.9,
  },
  {
    name: "Puck Mug",
    category: "home",
    price: 18,
    rating: 4.7,
  },
  {
    name: "Puck Stickers",
    category: "swag",
    price: 9,
    rating: 4.8,
  },
  {
    name: "Puck Notebook",
    category: "office",
    price: 24,
    rating: 4.6,
  },
];

export const viewSources: ViewSources = {
  products: {
    fields: {
      category: {
        type: "select",
        options: [
          { label: "All", value: "all" },
          { label: "Apparel", value: "apparel" },
          { label: "Home", value: "home" },
          { label: "Office", value: "office" },
          { label: "Swag", value: "swag" },
        ],
      },
      limit: {
        type: "number",
        min: 1,
        max: 4,
      },
      sortBy: {
        type: "select",
        options: [
          { label: "Rating", value: "rating" },
          { label: "Price", value: "price" },
        ],
      },
    },
    fetch: async (params = {}) => {
      const category = params.category || "all";
      const limit = Number(params.limit || 3);
      const sortBy = params.sortBy === "price" ? "price" : "rating";
      const filtered =
        category === "all"
          ? products
          : products.filter((product) => product.category === category);

      return filtered
        .slice()
        .sort((left, right) => right[sortBy] - left[sortBy])
        .slice(0, limit);
    },
  },
};

export const builtInViews: BuiltInView[] = [
  {
    id: "topProducts",
    label: "Top products",
    source: "products",
    params: {
      category: "all",
      limit: 3,
      sortBy: "rating",
    },
  },
];

export const viewsPluginOptions: ViewsPluginOptions = {
  sources: viewSources,
  builtInViews,
};
