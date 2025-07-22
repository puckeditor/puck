import { Config, Data, Slot } from "../../types";
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

  it("should migrate dynamic arrays of zones to slots when a user provides a migration function", () => {
    const input: Data = {
      root: {
        props: {
          title: "Legacy Zones Migration",
        },
      },
      content: [
        {
          type: "Columns",
          props: {
            columns: [{}, {}, {}, {}],
            id: "Columns-eb9dfe22-4408-44e6-b8e5-fbaedbbdb3be",
          },
        },
      ],
      zones: {
        "Columns-eb9dfe22-4408-44e6-b8e5-fbaedbbdb3be:column-0": [
          {
            type: "Text",
            props: {
              text: "Drop zone 1",
              id: "Text-c2b5c0a5-d76b-4120-8bb3-99934e119967",
            },
          },
        ],
        "Columns-eb9dfe22-4408-44e6-b8e5-fbaedbbdb3be:column-1": [
          {
            type: "Text",
            props: {
              text: "Drop zone 2",
              id: "Text-8bdcf6ef-ba8c-4d5e-8010-e505a773e8d8",
            },
          },
        ],
        "Columns-eb9dfe22-4408-44e6-b8e5-fbaedbbdb3be:column-2": [
          {
            type: "Text",
            props: {
              text: "Drop zone 3",
              id: "Text-2f8f393a-d4ed-4714-9552-89defa056ed9",
            },
          },
        ],
        "Columns-eb9dfe22-4408-44e6-b8e5-fbaedbbdb3be:column-3": [
          {
            type: "Text",
            props: {
              text: "Drop zone 4",
              id: "Text-af41f55a-8af0-4e0c-8972-d54935301474",
            },
          },
        ],
      },
    };

    const config: Config<{ Columns: { columns: { column: Slot } } }> = {
      components: {
        Columns: {
          fields: {
            columns: {
              type: "array",
              arrayFields: {
                column: {
                  type: "slot",
                },
              },
            },
          },
          render: () => <div />,
        },
      },
    };

    const output: Data = {
      root: {
        props: {
          title: "Legacy Zones Migration",
        },
      },
      content: [
        {
          type: "Columns",
          props: {
            columns: [
              {
                column: [
                  {
                    type: "Text",
                    props: {
                      text: "Drop zone 1",
                      id: "Text-c2b5c0a5-d76b-4120-8bb3-99934e119967",
                    },
                  },
                ],
              },
              {
                column: [
                  {
                    type: "Text",
                    props: {
                      text: "Drop zone 2",
                      id: "Text-8bdcf6ef-ba8c-4d5e-8010-e505a773e8d8",
                    },
                  },
                ],
              },
              {
                column: [
                  {
                    type: "Text",
                    props: {
                      text: "Drop zone 3",
                      id: "Text-2f8f393a-d4ed-4714-9552-89defa056ed9",
                    },
                  },
                ],
              },
              {
                column: [
                  {
                    type: "Text",
                    props: {
                      text: "Drop zone 4",
                      id: "Text-af41f55a-8af0-4e0c-8972-d54935301474",
                    },
                  },
                ],
              },
            ],
            id: "Columns-eb9dfe22-4408-44e6-b8e5-fbaedbbdb3be",
          },
        },
      ],
    };

    expect(
      migrate(input, config, {
        migrateDynamicZonesForComponent: {
          Columns: (props, zones) => {
            return {
              ...props,
              columns: Object.values(zones).map((zone) => ({
                column: zone,
              })),
            };
          },
        },
      })
    ).toEqual(output);
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
