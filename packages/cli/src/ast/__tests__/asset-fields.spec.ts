import { toAssetFields } from "../asset-fields";
import { parseModule } from "../parse";
import { readRecipe } from "../../../__tests__/helpers/harness";

const CONFIG = `import type { Config } from "@puckeditor/core";

type Props = {
  Hero: { title: string; image: string; video?: string };
  Logos: { items: { name: string; logo: string }[] };
  Card: { photo: { src: string; alt: string } };
};

export const config: Config<Props> = {
  components: {
    Hero: {
      fields: {
        title: { type: "text" },
        image: { type: "text", label: "Image URL" },
        video: { type: "text", ai: { stream: false } },
      },
      defaultProps: { title: "Hello", image: "https://example.com/a.png", video: "" },
      render: ({ title, image, video }) => (
        <section style={{ backgroundImage: \`url(\${image})\` }}>
          <img src={image} alt={title} />
          <video src={video} />
        </section>
      ),
    },
    Logos: {
      fields: {
        items: {
          type: "array",
          arrayFields: { name: { type: "text" }, logo: { type: "text" } },
          defaultItemProps: { name: "Logo", logo: "/logo.svg" },
        },
      },
      defaultProps: { items: [{ name: "A", logo: "/a.svg" }] },
      render: ({ items }) => (
        <ul>
          {items.map((item) => (
            <img key={item.name} src={item.logo} />
          ))}
        </ul>
      ),
    },
    Card: {
      fields: {
        photo: {
          type: "object",
          objectFields: { src: { type: "text" }, alt: { type: "text" } },
        },
      },
      render: ({ photo }) => <img src={photo.src} alt={photo.alt} />,
    },
  },
};

export default config;
`;

const MIGRATED = `import type { Config } from "@puckeditor/core";
import { assetField } from "@puckeditor/plugin-assets";
import type { AssetValue } from "@puckeditor/plugin-assets";

/** An asset's URL, including URLs stored before the field held assets */
const assetSrc = (value?: AssetValue | string) =>
  typeof value === "string" ? value : value?.src;

type Props = {
  Hero: { title: string; image: AssetValue; video?: AssetValue };
  Logos: { items: { name: string; logo: AssetValue }[] };
  Card: { photo: { src: string; alt: string } };
};

export const config: Config<Props> = {
  components: {
    Hero: {
      fields: {
        title: { type: "text" },
        image: assetField({ label: "Image URL", accept: ["image/*"] }),
        video: { ...assetField({ accept: ["video/*"] }), ai: { stream: false } },
      },
      defaultProps: { title: "Hello", image: { src: "https://example.com/a.png" }, video: undefined },
      render: ({ title, image, video }) => (
        <section style={{ backgroundImage: \`url(\${assetSrc(image)})\` }}>
          <img src={assetSrc(image)} alt={title} />
          <video src={assetSrc(video)} />
        </section>
      ),
    },
    Logos: {
      fields: {
        items: {
          type: "array",
          arrayFields: { name: { type: "text" }, logo: assetField({ accept: ["image/*"] }) },
          defaultItemProps: { name: "Logo", logo: { src: "/logo.svg" } },
        },
      },
      defaultProps: { items: [{ name: "A", logo: { src: "/a.svg" } }] },
      render: ({ items }) => (
        <ul>
          {items.map((item) => (
            <img key={item.name} src={assetSrc(item.logo)} />
          ))}
        </ul>
      ),
    },
    Card: {
      fields: {
        photo: assetField({ accept: ["image/*"] }),
      },
      render: ({ photo }) => <img src={photo.src} alt={photo.alt} />,
    },
  },
};

export default config;
`;

const ALL = ["Hero.image", "Hero.video", "Logos.items[].logo", "Card.photo"];

const edited = (code: string, ids: string[], file = "puck.config.tsx") => {
  const result = toAssetFields(code, file, ids);
  if (result.status !== "edited") throw new Error(JSON.stringify(result));
  // Every rewrite has to stay valid code
  parseModule(result.code, file);
  return result;
};

/** A one-component config with `render` */
const hero = (render: string) => `export default {
  components: {
    Hero: { fields: { image: { type: "text" } }, render: ${render} },
  },
};
`;

/** A config typed with HeroProps, which `types` declares or imports */
const typed = (
  types: string
) => `import type { Config } from "@puckeditor/core";
${types}
type Props = { Hero: HeroProps };

export const config: Config<Props> = {
  components: {
    Hero: { fields: { image: { type: "text" } }, render: ({ image }) => <img src={image} /> },
  },
};
`;

/** A config whose Logos component has an array of logos */
const logos = (render: string) => `const styles = { logo: "logo" };

export default {
  components: {
    Logos: {
      fields: {
        items: { type: "array", arrayFields: { logo: { type: "text" } } },
      },
      render: ${render},
    },
  },
};
`;

describe("toAssetFields", () => {
  it("switches fields, defaults, props types and renders to assets", () => {
    const result = edited(CONFIG, ALL);
    expect(result.manual).toEqual([]);
    expect(result.code).toBe(MIGRATED);
  });

  it("only changes the chosen fields", () => {
    const { code } = edited(CONFIG, ["Card.photo"]);
    expect(code).toContain('photo: assetField({ accept: ["image/*"] })');
    expect(code).toContain('image: { type: "text", label: "Image URL" }');
    // { src, alt } objects need no helper or type changes
    expect(code).not.toContain("assetSrc");
    expect(code).not.toContain("AssetValue");
  });

  it("leaves fields it already switched", () => {
    expect(toAssetFields(MIGRATED, "puck.config.tsx", ALL)).toEqual({
      status: "unchanged",
    });
  });

  it("merges into an existing plugin-assets import, and reuses assetSrc", () => {
    const once = edited(CONFIG, ["Hero.image"]).code;
    const { code } = edited(once, ["Logos.items[].logo"]);
    expect(code).toContain(
      'import { assetField } from "@puckeditor/plugin-assets";\nimport type { AssetValue } from "@puckeditor/plugin-assets";\n\n/**'
    );
    expect(code.match(/const assetSrc/g)).toHaveLength(1);
    expect(code).toContain("src={assetSrc(item.logo)}");
  });

  it("writes JavaScript without types", () => {
    const { code } = edited(
      `import { Hero } from "./hero";

export default {
  components: {
    Hero: {
      fields: { image: { type: "text" } },
      render: (props) => <img src={props.image} />,
    },
  },
};
`,
      ["Hero.image"],
      "puck.config.jsx"
    );
    expect(code).toBe(`import { Hero } from "./hero";
import { assetField } from "@puckeditor/plugin-assets";

/** An asset's URL, including URLs stored before the field held assets */
const assetSrc = (value) =>
  typeof value === "string" ? value : value?.src;

export default {
  components: {
    Hero: {
      fields: { image: assetField({ accept: ["image/*"] }) },
      render: (props) => <img src={assetSrc(props.image)} />,
    },
  },
};
`);
  });

  it.each([
    ["spreads its props", "(props) => <Hero {...props} />"],
    ["passes its props to a component", "(props) => <Hero data={props} />"],
    ["spreads the rest", "({ title, ...rest }) => <Hero {...rest} />"],
    ["destructures with a default", '({ image = "" }) => <img src={image} />'],
  ])("asks for a manual edit when render %s", (_, render) => {
    const result = edited(hero(render), ["Hero.image"]);
    expect(result.manual).toEqual([
      expect.objectContaining({ field: "Hero.image" }),
    ]);
    // The field still switches, but nothing reads assetSrc
    expect(result.code).toContain("assetField(");
    expect(result.code).not.toContain("const assetSrc");
  });

  it("expands shorthand properties", () => {
    const { code } = edited(hero("({ image }) => <Picture {...{ image }} />"), [
      "Hero.image",
    ]);
    expect(code).toContain("<Picture {...{ image: assetSrc(image) }} />");
  });

  it("leaves parameters that shadow the value", () => {
    const { code } = edited(
      hero(
        "({ image, gallery }) => <div><img src={image} />{gallery.map((image) => <img src={image.url} />)}</div>"
      ),
      ["Hero.image"]
    );
    expect(code).toContain(
      "<img src={assetSrc(image)} />{gallery.map((image) => <img src={image.url} />)}"
    );
  });

  it.each([
    ["destructured items", "items.map(({ logo }) => <img src={logo} />)"],
    [
      "items",
      "items.map((item) => <img className={styles.logo} src={item.logo} />)",
    ],
    ["for...of items", "{ for (const { logo } of items) use(logo); }"],
    [
      "aliased items",
      "{ const list = items; return list.map((i) => i.logo); }",
    ],
  ])("follows nested values through %s", (_, body) => {
    const render = `({ items }) => ${body}`;
    const { code, manual } = edited(logos(render), ["Logos.items[].logo"]);
    expect(manual).toEqual([]);
    expect(code).toMatch(/assetSrc\((item\.|i\.)?logo\)/);
    expect(code).not.toContain("logo: assetSrc");
    // Only reads along the field's path
    expect(code).not.toContain("assetSrc(styles");
  });

  it("switches a field and a nested field with the same key", () => {
    const { code } = edited(
      `export default {
  components: {
    Hero: {
      fields: {
        image: { type: "text" },
        items: { type: "array", arrayFields: { image: { type: "text" } } },
      },
      render: (props) => <div><img src={props.image} />{props.items.map((item) => <img src={item.image} />)}</div>,
    },
  },
};
`,
      ["Hero.image", "Hero.items[].image"]
    );
    expect(code).toContain(
      "<img src={assetSrc(props.image)} />{props.items.map((item) => <img src={assetSrc(item.image)} />)}"
    );
  });

  it("asks for a manual edit when items are passed on", () => {
    const { manual } = edited(
      logos("({ items }) => items.map((item) => <Logo {...item} />)"),
      ["Logos.items[].logo"]
    );
    expect(manual).toEqual([
      expect.objectContaining({ field: "Logos.items[].logo" }),
    ]);
  });

  it("follows props types through local type names and unions", () => {
    const { code, manual } = edited(
      typed("interface HeroProps { image: string | undefined }"),
      ["Hero.image"]
    );
    expect(manual).toEqual([]);
    expect(code).toContain(
      "interface HeroProps { image: AssetValue | undefined }"
    );
  });

  it("asks for a manual edit when the props type can't be followed", () => {
    const { code, manual } = edited(
      typed('import type { HeroProps } from "./hero";'),
      ["Hero.image"]
    );
    expect(manual).toEqual([
      expect.objectContaining({ kind: "type", field: "Hero.image" }),
    ]);
    expect(code).toContain(
      'import type { AssetValue } from "@puckeditor/plugin-assets";'
    );
  });

  it("reads the recipes' config", () => {
    const recipe = readRecipe("next", "puck.config.tsx").replace(
      'title: { type: "text" },',
      'title: { type: "text" },\n          image: { type: "text" },'
    );
    const { code } = edited(recipe, ["HeadingBlock.image"]);
    expect(code).toContain('image: assetField({ accept: ["image/*"] }),');
  });

  it("explains configs it can't read", () => {
    expect(toAssetFields("export default make();", "c.ts", ["A.b"])).toEqual({
      status: "error",
      detail: "The config is not an object literal (e.g. it's a function)",
    });
  });
});
