import { Config, Data } from "../../types";
import { migrate } from "../migrate";

jest.spyOn(console, "warn").mockImplementation(() => {});

describe("migrate method", () => {
  it("should migrate root to root.props", () => {
    expect(
      migrate(
        { content: [], root: { title: "Hello, world" } },
        { components: {} }
      )
    ).toEqual({
      content: [],
      root: { props: { title: "Hello, world" } },
    });
  });

  it("should migrate zones to slots", () => {
    const input: Data = {
      content: [{ type: "Flex", props: { id: "Flex-123" } }],
      root: {},
      zones: {
        "Flex-123:flexA": [{ type: "Other", props: { id: "Other-123" } }],
        "Flex-123:flexB": [{ type: "Heading", props: { id: "Heading-123" } }],
        "Other-123:content": [
          { type: "Heading", props: { id: "Heading-456" } },
        ],
      },
    };

    const config: Config = {
      components: {
        Flex: {
          fields: {
            // Migrate to slots for Flex
            flexA: { type: "slot" },
            flexB: { type: "slot" },
          },
          render: () => <div />,
        },
        Other: {
          fields: {
            // Migrate to slots for Other
            content: { type: "slot" },
          },
          render: () => <div />,
        },
        Heading: {
          render: () => <div />,
        },
      },
    };

    const output: Data = {
      content: [
        {
          type: "Flex",
          props: {
            id: "Flex-123",
            flexA: [
              {
                type: "Other",
                props: {
                  id: "Other-123",
                  content: [{ type: "Heading", props: { id: "Heading-456" } }],
                },
              },
            ],
            flexB: [{ type: "Heading", props: { id: "Heading-123" } }],
          },
        },
      ],
      root: { props: {} },
    };

    expect(migrate(input, config)).toEqual(output);
  });

  it("should throw if matching slots aren't defined", () => {
    const input: Data = {
      content: [{ type: "Grid", props: { id: "Grid-123" } }],
      root: {},
      zones: {
        "Grid-123:grid": [{ type: "Heading", props: { id: "Heading-123" } }],
      },
    };

    const config: Config = {
      components: {
        Grid: {
          render: () => <div />,
        },
        Heading: {
          render: () => <div />,
        },
      },
    };

    expect(() => migrate(input, config)).toThrowErrorMatchingInlineSnapshot(
      `"Could not migrate DropZone "Grid-123:grid" to slot field. No slot exists with the name "grid"."`
    );
  });

  it("should support migrating root DropZones", () => {
    const input: Data = {
      root: { props: { title: "" } },
      content: [
        {
          type: "HeadingBlock",
          props: {
            title: "Header",
            id: "HeadingBlock-1694032984497",
          },
        },
      ],
      zones: {
        "root:footer": [
          {
            type: "HeadingBlock",
            props: {
              id: "HeadingBlock-f7f88252-1926-4042-80b0-6c5ec72f2f75",
              title: "Footer header",
            },
          },
        ],
      },
    };

    const config: Config = {
      components: {
        HeadingBlock: {
          fields: {
            title: { type: "text" },
          },
          render: ({ title }) => <h1>{title}</h1>,
        },
      },
      root: {
        fields: {
          footer: { type: "slot" },
        },
        render: ({ children, footer }) => {
          return (
            <>
              {children}
              {footer()}
            </>
          );
        },
      },
    };

    expect(migrate(input, config)).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "props": {
              "id": "HeadingBlock-1694032984497",
              "title": "Header",
            },
            "type": "HeadingBlock",
          },
        ],
        "root": {
          "props": {
            "footer": [
              {
                "props": {
                  "id": "HeadingBlock-f7f88252-1926-4042-80b0-6c5ec72f2f75",
                  "title": "Footer header",
                },
                "type": "HeadingBlock",
              },
            ],
            "title": "",
          },
        },
      }
    `);
  });
});
