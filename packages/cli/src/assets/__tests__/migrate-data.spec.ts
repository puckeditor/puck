import { assetPaths, migratePageData } from "../migrate-data";

const PATHS = assetPaths([
  {
    component: "Hero",
    path: [{ key: "image", array: false }],
    shape: "string",
  },
  {
    component: "Logos",
    path: [
      { key: "items", array: true },
      { key: "logo", array: false },
    ],
    shape: "string",
  },
  {
    component: "Card",
    path: [
      { key: "author", array: false },
      { key: "avatar", array: false },
    ],
    shape: "string",
  },
  {
    component: "Card",
    path: [{ key: "photo", array: false }],
    shape: "object",
  },
  {
    component: "root",
    path: [{ key: "ogImage", array: false }],
    shape: "string",
  },
]);

const page = () => ({
  root: { props: { title: "Home", ogImage: "/og.png" } },
  content: [
    { type: "Hero", props: { id: "Hero-1", image: "/a.png", title: "Hi" } },
    {
      type: "Logos",
      props: {
        id: "Logos-1",
        items: [
          { name: "A", logo: "/a.svg" },
          { name: "B", logo: "" },
          { name: "C" },
        ],
      },
    },
    {
      type: "Columns",
      props: {
        id: "Columns-1",
        // A slot
        left: [{ type: "Hero", props: { id: "Hero-2", image: "/b.png" } }],
      },
    },
  ],
  zones: {
    "Columns-1:right": [
      {
        type: "Card",
        props: {
          id: "Card-1",
          author: { avatar: "/me.png" },
          photo: { src: "/p.png", alt: "" },
        },
      },
    ],
  },
});

describe("migratePageData", () => {
  it("turns URLs into assets in root, content, slots and zones", () => {
    const data = page();
    expect(migratePageData(data, PATHS)).toBe(6);
    expect(data).toEqual({
      root: { props: { title: "Home", ogImage: { src: "/og.png" } } },
      content: [
        {
          type: "Hero",
          props: { id: "Hero-1", image: { src: "/a.png" }, title: "Hi" },
        },
        {
          type: "Logos",
          props: {
            id: "Logos-1",
            items: [
              { name: "A", logo: { src: "/a.svg" } },
              { name: "B" },
              { name: "C" },
            ],
          },
        },
        {
          type: "Columns",
          props: {
            id: "Columns-1",
            left: [
              {
                type: "Hero",
                props: { id: "Hero-2", image: { src: "/b.png" } },
              },
            ],
          },
        },
      ],
      zones: {
        "Columns-1:right": [
          {
            type: "Card",
            props: {
              id: "Card-1",
              author: { avatar: { src: "/me.png" } },
              photo: { src: "/p.png", alt: "" },
            },
          },
        ],
      },
    });
  });

  it("changes nothing the second time", () => {
    const data = page();
    migratePageData(data, PATHS);
    const once = JSON.parse(JSON.stringify(data));
    expect(migratePageData(data, PATHS)).toBe(0);
    expect(data).toEqual(once);
  });

  it("reads root props kept on root itself", () => {
    const data = { root: { ogImage: "/og.png" }, content: [] };
    expect(migratePageData(data, PATHS)).toBe(1);
    expect(data.root).toEqual({ ogImage: { src: "/og.png" } });
  });

  it("ignores data that isn't Puck data", () => {
    expect(migratePageData(null, PATHS)).toBe(0);
    expect(migratePageData({ content: "nope" }, PATHS)).toBe(0);
  });
});
