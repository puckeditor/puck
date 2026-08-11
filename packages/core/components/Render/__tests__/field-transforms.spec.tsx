import { renderToString } from "react-dom/server.node";
import { Config, Data, DefaultComponents } from "../../../types";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { Render } from "../index";

describe("Render fieldTransforms", () => {
  const config: Config = {
    root: {
      fields: {
        title: { type: "text" },
        hero: { type: "slot" },
      },
      render: ({ title, hero, children }: any) => {
        const Hero = hero;

        return (
          <main>
            <span>{title}</span>
            {typeof Hero === "function" ? <Hero /> : null}
            {children}
          </main>
        );
      },
    },
    components: {
      Section: {
        fields: { items: { type: "slot" } },
        render: ({ items }: any) => {
          const Items = items;

          return (
            <section>{typeof Items === "function" ? <Items /> : null}</section>
          );
        },
      },
      Heading: {
        fields: { title: { type: "text" } },
        render: ({ title }: any) => <h2>{title}</h2>,
      },
    },
  };

  const data: Data<DefaultComponents, any> = {
    root: {
      props: {
        title: "Root title",
        hero: [
          {
            type: "Heading",
            props: { id: "in-root-slot", title: "In root slot" },
          },
        ],
      },
    },
    content: [
      {
        type: "Section",
        props: {
          id: "section-1",
          items: [
            {
              type: "Heading",
              props: { id: "in-nested-slot", title: "In nested slot" },
            },
          ],
        },
      },
    ],
  };

  it("leaves props untouched when no fieldTransforms are given", () => {
    const html = renderToString(<Render config={config} data={data} />);

    expect(html).toContain("<span>Root title</span>");
    expect(html).toContain("<h2>In root slot</h2>");
    expect(html).toContain("<h2>In nested slot</h2>");
    expect(html).not.toContain("<mark>");
  });

  it("applies a transform to root props and to children at every depth", () => {
    const html = renderToString(
      <Render
        config={config}
        data={data}
        fieldTransforms={{
          text: ({ value }) => <mark>{value}</mark>,
        }}
      />
    );

    expect(html).toContain("<span><mark>Root title</mark></span>");
    expect(html).toContain("<h2><mark>In root slot</mark></h2>");
    expect(html).toContain("<h2><mark>In nested slot</mark></h2>");
  });

  // Render returns from a different branch when the config has no root render,
  // which is easy to miss when threading transforms down to the dropzones.
  it("applies a transform when the config has no root render", () => {
    const configWithoutRootRender: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }: any) => <h2>{title}</h2>,
        },
      },
    };

    const html = renderToString(
      <Render
        config={configWithoutRootRender}
        data={{
          root: { props: {} },
          content: [
            { type: "Heading", props: { id: "h1", title: "Top level" } },
          ],
        }}
        fieldTransforms={{ text: ({ value }) => <mark>{value}</mark> }}
      />
    );

    expect(html).toContain("<h2><mark>Top level</mark></h2>");
  });

  // Regression: useRichtextProps returns a full copy of the props it is given
  // whenever the component has a richtext field, so feeding it the raw props
  // discarded every transformed prop on a root that also has a slot field.
  it("keeps slot and transformed props on a root that also has a richtext field", () => {
    const richtextRootConfig: Config = {
      root: {
        fields: {
          intro: { type: "richtext" },
          title: { type: "text" },
          hero: { type: "slot" },
        },
        render: ({ title, hero }: any) => {
          const Hero = hero;

          return (
            <main>
              <span>{title}</span>
              {typeof Hero === "function" ? (
                <Hero />
              ) : (
                `RAW:${JSON.stringify(hero)}`
              )}
            </main>
          );
        },
      },
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }: any) => <h2>{title}</h2>,
        },
      },
    };

    const richtextRootData: Data<DefaultComponents, any> = {
      root: {
        props: {
          intro: "<p>Intro</p>",
          title: "Root title",
          hero: [
            {
              type: "Heading",
              props: { id: "heading-1", title: "In root slot" },
            },
          ],
        },
      },
      content: [],
    };

    const html = renderToString(
      <Render
        config={richtextRootConfig}
        data={richtextRootData}
        fieldTransforms={{ text: ({ value }) => <mark>{value}</mark> }}
      />
    );

    expect(html).not.toContain("RAW:");
    expect(html).toContain("<h2><mark>In root slot</mark></h2>");
    expect(html).toContain("<span><mark>Root title</mark></span>");
  });

  it("honours a user richtext transform instead of the built-in richtext rendering", () => {
    const richtextConfig: Config = {
      components: {
        Article: {
          fields: { body: { type: "richtext" } },
          render: ({ body }: any) => <article>{body}</article>,
        },
      },
    };

    const html = renderToString(
      <Render
        config={richtextConfig}
        data={{
          root: { props: {} },
          content: [
            {
              type: "Article",
              props: {
                id: "article-1",
                body: "<p>Hello <strong>world</strong></p>",
              },
            },
          ],
        }}
        fieldTransforms={{
          richtext: ({ value }) => <pre>{value}</pre>,
        }}
      />
    );

    expect(html).toContain("<pre>");
    expect(html).toContain(
      "&lt;p&gt;Hello &lt;strong&gt;world&lt;/strong&gt;&lt;/p&gt;"
    );
    expect(html).not.toContain('<div class="RichTextEditor">');
  });

  // The transform walker replaces a parent (object/array) field and stops
  // recursing, so the nested richtext leaf could no longer exist. The built-in
  // richtext pass must not still try to descend into the replaced value:
  // mapDeep would spread a non-object leaf (e.g. string) into unusable data (e.g. `{ 0: "h", 1: "e" }`) 
  // and React crashes.
  it("does not process richtext nested inside an object that a transform replaced", () => {
    const nestedRichtextConfig: Config = {
      components: {
        Card: {
          fields: {
            meta: {
              type: "object",
              objectFields: { body: { type: "richtext" } },
            },
          },
          render: ({ meta }: any) => <div>{meta}</div>,
        },
      },
    };

    const html = renderToString(
      <Render
        config={nestedRichtextConfig}
        data={{
          root: { props: {} },
          content: [
            {
              type: "Card",
              props: { id: "card-1", meta: { body: "<p>hidden</p>" } },
            },
          ],
        }}
        fieldTransforms={{
          object: ({ value }) => `meta:${Object.keys(value).length}`,
        }}
      />
    );

    expect(html).toContain("meta:1");
    expect(html).not.toContain("hidden");
  });

  it("does not process richtext nested inside an array that a transform replaced", () => {
    const nestedRichtextConfig: Config = {
      components: {
        List: {
          fields: {
            rows: {
              type: "array",
              arrayFields: { body: { type: "richtext" } },
            },
          },
          render: ({ rows }: any) => <ul>{rows}</ul>,
        },
      },
    };

    const html = renderToString(
      <Render
        config={nestedRichtextConfig}
        data={{
          root: { props: {} },
          content: [
            {
              type: "List",
              props: {
                id: "list-1",
                rows: [{ body: "<p>a</p>" }, { body: "<p>b</p>" }],
              },
            },
          ],
        }}
        fieldTransforms={{
          array: ({ value }) => `rows:${value.length}`,
        }}
      />
    );

    expect(html).toContain("rows:2");
    expect(html).not.toContain("<p>a</p>");
  });
});
