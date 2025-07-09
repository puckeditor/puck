import { Config, Data } from "../../types";
import { resolveAllData } from "../resolve-all-data";

const item1 = {
  type: "ComponentWithResolveProps",
  props: { id: "MyComponent-1", prop: "Original", slot: [] },
};
const item3 = {
  type: "ComponentWithoutResolveProps",
  props: { id: "MyComponent-3", prop: "Original", slot: [] },
};
const item2 = {
  type: "ComponentWithoutResolveProps",
  props: { id: "MyComponent-2", prop: "Original", slot: [item3] },
};

const data: Data = {
  root: { props: { title: "" } },
  content: [item1],
  zones: {
    "MyComponent-1:zone": [item2],
  },
};

const config: Config = {
  components: {
    ComponentWithResolveProps: {
      defaultProps: { prop: "example" },
      resolveData: async ({ props }) => {
        return {
          props: { ...props, prop: "Resolved" },
          readOnly: { prop: true },
        };
      },
      render: () => <div />,
    },
    ComponentWithoutResolveProps: {
      defaultProps: { prop: "example" },
      render: () => <div />,
    },
  },
};

describe("resolve-data", () => {
  it("should resolve the data for all components in the data", async () => {
    expect(await resolveAllData(data, config)).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "props": {
              "id": "MyComponent-1",
              "prop": "Resolved",
              "slot": [],
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
                "id": "MyComponent-2",
                "prop": "Original",
                "slot": [
                  {
                    "props": {
                      "id": "MyComponent-3",
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
        },
      }
    `);
  });
});
