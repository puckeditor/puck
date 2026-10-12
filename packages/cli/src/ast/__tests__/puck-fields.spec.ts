import { assetCandidates, findConfigObject, listFields } from "../puck-fields";
import { readRecipe } from "../../../__tests__/helpers/harness";

const CONFIG = `import type { Config } from "@puckeditor/core";

type Props = {
  Hero: { title: string; image: string; background: string };
  Logos: { items: { name: string; logo: string }[] };
  Card: { photo: { src: string; alt: string }; author: { avatar: string } };
};

export const config: Config<Props> = {
  root: {
    fields: { title: { type: "text" }, ogImage: { type: "text" } },
  },
  components: {
    Hero: {
      fields: {
        title: { type: "text" },
        image: { type: "text", label: "Image URL" },
        background: { type: "text" },
        size: { type: "select", options: [] },
      },
      render: ({ title, image }) => <img src={image} alt={title} />,
    },
    Logos: {
      fields: {
        items: {
          type: "array",
          arrayFields: { name: { type: "text" }, logo: { type: "textarea" } },
        },
      },
      render: ({ items }) => <div />,
    },
    Card: {
      fields: {
        photo: {
          type: "object",
          objectFields: { src: { type: "text" }, alt: { type: "text" } },
        },
        author: {
          type: "object",
          objectFields: { avatar: { type: "text" } },
        },
        poster: sharedPoster,
      },
      render: () => <div />,
    },
  },
};

export default config;
`;

const resolve = (code: string, file = "puck.config.tsx") => {
  const found = findConfigObject(code, file);
  if (!found.ok) throw new Error(found.detail);
  return found;
};

describe("findConfigObject", () => {
  it.each(["next", "vite", "react-router-ai"])(
    "finds the %s recipe's config",
    (recipe) => {
      const file =
        recipe === "vite" ? "src/puck.config.tsx" : "puck.config.tsx";
      const found = resolve(readRecipe(recipe, file));
      expect(found.config.type).toBe("ObjectExpression");
      expect(found.propsType).toBe("Props");
    }
  );

  it.each([
    [`export default { components: {} };`, null],
    [`export default defineConfig<Props>({ components: {} });`, "Props"],
    [
      `const config = { components: {} } satisfies Config<P>;\nexport default config;`,
      "P",
    ],
    [
      `const config = { components: {} } as Config<P>;\nexport { config };`,
      "P",
    ],
  ])("unwraps %s", (code, propsType) => {
    expect(resolve(code, "c.ts").propsType).toBe(propsType);
  });

  it("explains what it can't read", () => {
    expect(findConfigObject(`export default makeConfig();`, "c.ts")).toEqual({
      ok: false,
      detail: "The config is not an object literal (e.g. it's a function)",
    });
    expect(findConfigObject(`export const other = {};`, "c.ts")).toMatchObject({
      ok: false,
    });
  });
});

describe("listFields", () => {
  const fields = () => listFields(CONFIG, resolve(CONFIG));

  it("lists fields with their ids, shapes and lines", () => {
    expect(
      fields().map(({ id, type, shape, match }) => ({ id, type, shape, match }))
    ).toEqual([
      { id: "Hero.title", type: "text", shape: "string", match: null },
      { id: "Hero.image", type: "text", shape: "string", match: "strong" },
      { id: "Hero.background", type: "text", shape: "string", match: "weak" },
      { id: "Hero.size", type: "select", shape: null, match: null },
      { id: "Logos.items[]", type: "array", shape: null, match: null },
      { id: "Logos.items[].name", type: "text", shape: "string", match: null },
      {
        id: "Logos.items[].logo",
        type: "textarea",
        shape: "string",
        match: "strong",
      },
      { id: "Card.photo", type: "object", shape: "object", match: "strong" },
      { id: "Card.author", type: "object", shape: null, match: null },
      {
        id: "Card.author.avatar",
        type: "text",
        shape: "string",
        match: "strong",
      },
      { id: "root.title", type: "text", shape: "string", match: null },
      { id: "root.ogImage", type: "text", shape: "string", match: "strong" },
    ]);
    expect(fields().find((f) => f.id === "Hero.image")!.line).toBe(17);
  });

  it("suggests image-like fields that hold a URL or { src }", () => {
    expect(assetCandidates(fields()).map((f) => f.id)).toEqual([
      "Hero.image",
      "Hero.background",
      "Logos.items[].logo",
      "Card.photo",
      "Card.author.avatar",
      "root.ogImage",
    ]);
  });

  it("finds nothing to suggest in the recipes", () => {
    const code = readRecipe("next", "puck.config.tsx");
    expect(assetCandidates(listFields(code, resolve(code)))).toEqual([]);
  });
});
