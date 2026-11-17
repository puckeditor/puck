import { renderToString } from "react-dom/server.node";
import { Config, Data, DefaultComponents } from "../../../types";
import { Render } from "../index";

describe("ServerRender fieldTransforms", () => {
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
      Wrapper: {
        fields: {},
        render: ({ puck }: any) => (
          <div>{puck.renderDropZone({ zone: "zone" })}</div>
        ),
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
      { type: "Wrapper", props: { id: "wrapper-1" } },
    ],
    zones: {
      "wrapper-1:zone": [
        { type: "Heading", props: { id: "in-zone", title: "In zone" } },
      ],
    },
  };

  it("leaves props untouched when no fieldTransforms are given", () => {
    const html = renderToString(<Render config={config} data={data} />);

    expect(html).toContain("<span>Root title</span>");
    expect(html).toContain("<h2>In root slot</h2>");
    expect(html).toContain("<h2>In nested slot</h2>");
    expect(html).toContain("<h2>In zone</h2>");
    expect(html).not.toContain("<mark>");
  });

  it("applies a transform to root props, zone children and slot children at every depth", () => {
    const html = renderToString(
      <Render
        config={config}
        data={data}
        fieldTransforms={{
          text: ({ value }) => <mark>{value}</mark>,
        }}
      />
    );

    // Root props
    expect(html).toContain("<span><mark>Root title</mark></span>");
    // Slot child of root
    expect(html).toContain("<h2><mark>In root slot</mark></h2>");
    // Slot child of a component in root content
    expect(html).toContain("<h2><mark>In nested slot</mark></h2>");
    // Child rendered through puck.renderDropZone
    expect(html).toContain("<h2><mark>In zone</mark></h2>");
  });

  it("passes field metadata to the transform", () => {
    const seen: { propName: string; type: string; componentId: string }[] = [];

    renderToString(
      <Render
        config={config}
        data={data}
        fieldTransforms={{
          text: ({ value, propName, field, componentId }) => {
            seen.push({ propName, type: field.type, componentId });
            return value;
          },
        }}
      />
    );

    expect(seen).toContainEqual({
      propName: "title",
      type: "text",
      componentId: "puck-root",
    });
    expect(seen).toContainEqual({
      propName: "title",
      type: "text",
      componentId: "in-zone",
    });
  });

  it("applies transforms to fields nested in object and array fields", () => {
    const nestedConfig: Config = {
      components: {
        Card: {
          fields: {
            meta: {
              type: "object",
              objectFields: { label: { type: "text" } },
            },
            rows: {
              type: "array",
              arrayFields: { caption: { type: "text" } },
            },
          },
          render: ({ meta, rows }: any) => (
            <div>
              <em>{meta?.label}</em>
              {rows?.map((row: any, i: number) => (
                <p key={i}>{row.caption}</p>
              ))}
            </div>
          ),
        },
      },
    };

    const nestedData: Data = {
      root: { props: {} },
      content: [
        {
          type: "Card",
          props: {
            id: "card-1",
            meta: { label: "Object label" },
            rows: [{ caption: "Row one" }, { caption: "Row two" }],
          },
        },
      ],
    };

    const propPaths: string[] = [];

    const html = renderToString(
      <Render
        config={nestedConfig}
        data={nestedData}
        fieldTransforms={{
          text: ({ value, propPath }) => {
            propPaths.push(propPath);
            return <mark>{value}</mark>;
          },
        }}
      />
    );

    expect(propPaths).toEqual([
      "meta.label",
      "rows[0].caption",
      "rows[1].caption",
    ]);
    expect(html).toContain("<em><mark>Object label</mark></em>");
    expect(html).toContain("<p><mark>Row one</mark></p>");
    expect(html).toContain("<p><mark>Row two</mark></p>");
  });

  it("reports isReadOnly, since nothing is editable in Render", () => {
    const seen: boolean[] = [];

    renderToString(
      <Render
        config={config}
        data={data}
        fieldTransforms={{
          text: ({ value, isReadOnly }) => {
            seen.push(isReadOnly);
            return value;
          },
        }}
      />
    );

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
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

    const richtextData: Data = {
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
    };

    const html = renderToString(
      <Render
        config={richtextConfig}
        data={richtextData}
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

  it("lets a user transform override the built-in slot transform", () => {
    const slotConfig: Config = {
      root: {
        fields: { hero: { type: "slot" } },
        render: ({ hero }: any) => <main>{hero}</main>,
      },
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }: any) => <h2>{title}</h2>,
        },
      },
    };

    const html = renderToString(
      <Render
        config={slotConfig}
        data={data}
        fieldTransforms={{
          slot: ({ value }) => `slot has ${value.length} item(s)`,
        }}
      />
    );

    expect(html).toContain("slot has 1 item(s)");
    expect(html).not.toContain("<h2>In root slot</h2>");
  });

  // The transform walker replaces a parent (object/array) field and stops
  // recursing, so the nested richtext leaf no longer exists. The built-in
  // richtext pass must not still try to descend into the replaced value or it
  // spreads a non-object leaf into corrupt props and React crashes.
  it("does not process richtext nested inside a field that a transform replaced", () => {
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
});

describe("ServerRender root prop resolution", () => {
  // Regression: useRichtextProps returns a full copy of the props it is given
  // whenever the component has a richtext field, so feeding it the raw props
  // discarded every transformed prop on root.
  it("keeps slot and transformed props on a root that also has a richtext field", () => {
    const config: Config = {
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

    const data: Data<DefaultComponents, any> = {
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
        config={config}
        data={data}
        fieldTransforms={{ text: ({ value }) => <mark>{value}</mark> }}
      />
    );

    expect(html).not.toContain("RAW:");
    expect(html).toContain("<h2><mark>In root slot</mark></h2>");
    expect(html).toContain("<span><mark>Root title</mark></span>");
  });
});
