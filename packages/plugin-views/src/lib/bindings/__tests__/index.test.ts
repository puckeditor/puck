import { Config } from "@puckeditor/core";

import { countViewUsage } from "..";

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
});
