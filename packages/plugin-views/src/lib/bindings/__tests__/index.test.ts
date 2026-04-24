import { Config } from "@puckeditor/core";

import { countViewUsage, getNodeViewState, setNodeViewState } from "..";

describe("bindings service", () => {
  describe("collectViewUsageCounts", () => {
    it("counts template and binding usage", () => {
      const config: Config = {
        components: {
          TextBlock: {
            fields: {},
            render: () => null as any,
          },
        },
      };

      const counts = countViewUsage({
        data: {
          root: {
            props: {
              id: "root",
              __puck_view_state: {
                templates: {
                  title: "{{ topProducts[0].name }}",
                },
                bindings: {},
              },
            },
          },
          content: [
            {
              type: "TextBlock",
              props: {
                id: "Text-1",
                __puck_view_state: {
                  templates: {},
                  bindings: {
                    text: {
                      viewId: "topProducts",
                      path: "topProducts[0].name",
                    },
                  },
                },
              },
            },
          ],
        } as any,
        config,
      });

      expect(counts.topProducts).toBe(2);
    });
  });

  describe("node view state", () => {
    it("reads and writes synced state", () => {
      const props = setNodeViewState({
        props: {
          id: "Text-1",
        },
        nodeState: {
          templates: {},
          bindings: {},
          synced: {
            "items[*].title": {
              type: "derived",
            },
          },
        },
      });

      expect(getNodeViewState({ props })).toEqual({
        templates: {},
        bindings: {},
        synced: {
          "items[*].title": {
            type: "derived",
          },
        },
      });
    });

    it("removes the stored state when templates, bindings, and synced are empty", () => {
      const props = setNodeViewState({
        props: {
          id: "Text-1",
          __puck_view_state: {
            templates: {
              title: "{{ topProducts[0].name }}",
            },
            bindings: {},
            synced: {
              "items[*].title": {
                type: "derived",
              },
            },
          },
        },
        nodeState: {
          templates: {},
          bindings: {},
          synced: {},
        },
      });

      expect(props.__puck_view_state).toBeUndefined();
    });
  });
});
