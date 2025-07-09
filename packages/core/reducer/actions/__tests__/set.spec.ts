import { SetDataAction } from "../..";
import { defaultData, defaultState, testSetup } from "../__helpers__";

describe("Reducer", () => {
  const { reducer } = testSetup();

  describe("set action", () => {
    it("should set new data", () => {
      const newData = {
        ...defaultData,
        root: { props: { title: "Hello, world", slot: [] } },
        content: [{ type: "Comp", props: { id: "1", slot: [] } }],
      };

      const action: SetDataAction = {
        type: "setData",
        data: newData,
      };

      const newState = reducer(defaultState, action);
      expect(newState.data).toEqual(newData);
    });
  });
});
