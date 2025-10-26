import { ComponentData, Config, Data } from "../../types";
import { resolveAllData } from "../resolve-all-data";

const item4 = {
  type: "ComponentWithResolveProps",
  props: { id: "MyComponent-4", prop: "Original", slot: [] },
};
const item3 = {
  type: "ComponentWithResolveProps",
  props: { id: "MyComponent-3", prop: "Original", slot: [item4] },
};
const item2 = {
  type: "ComponentWithResolveProps",
  props: { id: "MyComponent-2", prop: "Original", slot: [] },
};
const item1 = {
  type: "ComponentWithResolveProps",
  props: { id: "MyComponent-1", prop: "Original", slot: [item2, item3] },
};
const item7 = {
  type: "ComponentWithResolveProps",
  props: { id: "MyComponent-7", prop: "Original", slot: [] },
};
const item5 = {
  type: "ComponentWithoutResolveProps",
  props: { id: "MyComponent-5", prop: "Original", slot: [] },
};
const item6 = {
  type: "ComponentWithoutResolveProps",
  props: { id: "MyComponent-6", prop: "Original", slot: [item5] },
};

const data: Data = {
  root: { props: { title: "" } },
  content: [item1],
  zones: {
    "MyComponent-1:zone": [item6],
    "MyComponent-5:zone": [item7],
  },
};

const resolveData = jest.fn(async ({ props }, { trigger }) => {
  return {
    props: { ...props, prop: "Resolved" },
    readOnly: { prop: true },
  };
});

const config: Config = {
  components: {
    ComponentWithResolveProps: {
      fields: { slot: { type: "slot" } },
      defaultProps: { prop: "example" },
      resolveData,
      render: () => <div />,
    },
    ComponentWithoutResolveProps: {
      fields: { slot: { type: "slot" } },
      defaultProps: { prop: "example" },
      render: () => <div />,
    },
  },
};

describe("resolve-data", () => {
  beforeEach(() => jest.restoreAllMocks());

  it("should resolve the data for all components in the data", async () => {
    expect(await resolveAllData(data, config)).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "props": {
              "id": "MyComponent-1",
              "prop": "Resolved",
              "slot": [
                {
                  "props": {
                    "id": "MyComponent-2",
                    "prop": "Resolved",
                    "slot": [],
                  },
                  "readOnly": {
                    "prop": true,
                  },
                  "type": "ComponentWithResolveProps",
                },
                {
                  "props": {
                    "id": "MyComponent-3",
                    "prop": "Resolved",
                    "slot": [
                      {
                        "props": {
                          "id": "MyComponent-4",
                          "prop": "Resolved",
                          "slot": [],
                        },
                        "readOnly": {
                          "prop": true,
                        },
                        "type": "ComponentWithResolveProps",
                      },
                    ],
                  },
                  "readOnly": {
                    "prop": true,
                  },
                  "type": "ComponentWithResolveProps",
                },
              ],
            },
            "readOnly": {
              "prop": true,
            },
            "type": "ComponentWithResolveProps",
          },
        ],
        "root": {
          "props": {
            "id": "root",
            "title": "",
          },
          "type": "root",
        },
        "zones": {
          "MyComponent-1:zone": [
            {
              "props": {
                "id": "MyComponent-6",
                "prop": "Original",
                "slot": [
                  {
                    "props": {
                      "id": "MyComponent-5",
                      "prop": "Original",
                      "slot": [],
                    },
                    "type": "ComponentWithoutResolveProps",
                  },
                ],
              },
              "type": "ComponentWithoutResolveProps",
            },
          ],
          "MyComponent-5:zone": [
            {
              "props": {
                "id": "MyComponent-7",
                "prop": "Resolved",
                "slot": [],
              },
              "readOnly": {
                "prop": true,
              },
              "type": "ComponentWithResolveProps",
            },
          ],
        },
      }
    `);
  });

  it("should receive 'force' as the trigger", async () => {
    await resolveAllData(data, config);

    expect(
      resolveData.mock.calls.every((call) => call[1].trigger === "force")
    ).toBe(true);
  });

  it("should receive the parent component in params", async () => {
    const item1_2_1 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1_2_1", prop: "Original", slot: [] },
    };
    const item1_2 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1_2", prop: "Original", slot: [item1_2_1] },
    };
    const item1_1 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1_1", prop: "Original", slot: [] },
    };
    const item1 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1", prop: "Original", slot: [item1_1] },
    };
    const data: Data = {
      root: { props: {} },
      content: [item1],
      zones: {
        "MyComponent-1:zone": [item1_2],
      },
    };

    let receivedParentById: Record<string, ComponentData | null> = {};

    const resolveData = jest.fn(async ({ props }, { parent }) => {
      receivedParentById[props.id] = parent;

      return {
        props: { ...props, prop: "Resolved" },
      };
    });

    const config: Config = {
      components: {
        ComponentWithResolveProps: {
          fields: { slot: { type: "slot" } },
          defaultProps: { prop: "example" },
          resolveData,
          render: () => <div />,
        },
      },
    };

    // When: --------------------
    await resolveAllData(data, config);

    // Then: --------------------
    expect(
      resolveData.mock.calls.every((call) => call[1].parent !== null)
    ).toBe(true);
    expect(receivedParentById[item1.props.id]?.props.id).toBe("root");
    expect(receivedParentById[item1_1.props.id]?.props.id).toBe(item1.props.id);
    expect(receivedParentById[item1_2.props.id]?.props.id).toBe(item1.props.id);
    expect(receivedParentById[item1_2_1.props.id]?.props.id).toBe(
      item1_2.props.id
    );
  });

  it("should resolve children after it resolved the parent", async () => {
    const item1_2_1 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1_2_1", prop: "Original", slot: [] },
    };
    const item1_2 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1_2", prop: "Original", slot: [item1_2_1] },
    };
    const item1_1 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1_1", prop: "Original", slot: [] },
    };
    const item1 = {
      type: "ComponentWithResolveProps",
      props: { id: "MyComponent-1", prop: "Original", slot: [item1_1] },
    };
    const data: Data = {
      root: { props: {} },
      content: [item1],
      zones: {
        "MyComponent-1:zone": [item1_2],
      },
    };

    let receivedParentById: Record<string, ComponentData | null> = {};

    const resolveData = jest.fn(async ({ props }, { parent }) => {
      receivedParentById[props.id] = parent;

      return {
        props: { ...props, prop: "Resolved" },
      };
    });

    const config: Config = {
      components: {
        ComponentWithResolveProps: {
          fields: { slot: { type: "slot" } },
          defaultProps: { prop: "example" },
          resolveData,
          render: () => <div />,
        },
      },
      root: {
        resolveData,
      },
    };

    // When: --------------------
    await resolveAllData(data, config);

    // Then: --------------------
    expect(receivedParentById[item1.props.id]?.props.id).toBe("root");
    expect(receivedParentById[item1.props.id]?.props.prop).toBe("Resolved");
    expect(receivedParentById[item1_1.props.id]?.props.id).toBe(item1.props.id);
    expect(receivedParentById[item1_1.props.id]?.props.prop).toBe("Resolved");
    expect(receivedParentById[item1_2.props.id]?.props.id).toBe(item1.props.id);
    expect(receivedParentById[item1_2.props.id]?.props.prop).toBe("Resolved");
    expect(receivedParentById[item1_2_1.props.id]?.props.id).toBe(
      item1_2.props.id
    );
    expect(receivedParentById[item1_2_1.props.id]?.props.prop).toBe("Resolved");
  });
});
