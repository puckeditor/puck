import { getNextTemplateState } from "../template-state";

import type { NodeViewState } from "../../../types";

describe("TemplateField", () => {
  describe("getNextTemplateState", () => {
    it("switches shared templates back to manual sync when template ownership is removed", () => {
      const currentNodeState: NodeViewState = {
        templates: {
          "arrayField[*].title": "Hello {{ topProducts[0].name }}",
        },
        bindings: {
          "arrayField[*]": {
            viewId: "topProducts",
            path: "topProducts[*]",
          },
        },
        synced: {
          "arrayField[*].title": {
            type: "derived",
          },
        },
      };

      expect(
        getNextTemplateState({
          fieldPath: "arrayField[0].title",
          currentNodeState,
          nextValue: "Manually authored",
        })
      ).toEqual({
        templates: {},
        bindings: currentNodeState.bindings,
        synced: {
          "arrayField[*].title": {
            type: "manual",
            value: "Manually authored",
          },
        },
      });
    });
  });
});
