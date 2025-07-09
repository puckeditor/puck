import { SetUiAction } from "../..";
import { defaultState, testSetup } from "../__helpers__";

describe("Reducer", () => {
  const { reducer } = testSetup();

  describe("setUi action", () => {
    it("should insert data into the state", () => {
      const action: SetUiAction = {
        type: "setUi",
        ui: { leftSideBarVisible: false },
      };

      const newState = reducer(defaultState, action);
      expect(newState.ui.leftSideBarVisible).toEqual(false);
    });
  });
});
