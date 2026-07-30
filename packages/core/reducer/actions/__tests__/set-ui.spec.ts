import { SetUiAction } from "../..";
import { defaultState, testSetup, UserData } from "../__helpers__";
import { PrivateAppState } from "../../../types/Internal";

describe("Reducer", () => {
  const { reducer, executeSequence } = testSetup();

  describe("setUi action", () => {
    it("should insert data into the state", () => {
      const action: SetUiAction = {
        type: "setUi",
        ui: { leftSideBarVisible: false },
      };

      const newState = reducer(defaultState, action);
      expect(newState.ui.leftSideBarVisible).toEqual(false);
    });

    it("should support functional ui updates", () => {
      const action: SetUiAction = {
        type: "setUi",
        ui: (previous) => ({
          leftSideBarVisible: !previous.leftSideBarVisible,
        }),
      };

      const newState = reducer(defaultState, action);
      expect(newState.ui.leftSideBarVisible).toEqual(false);
    });

    describe("selection reveal", () => {
      const stateWithNestedItems = () =>
        executeSequence(defaultState as PrivateAppState<UserData>, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "parent",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "parent:slot",
            destinationIndex: 0,
            id: "child",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "child:slot",
            destinationIndex: 0,
            id: "grandchild",
          }),
        ]);

      it("should expand the ancestors of the selected item, but not the item itself", () => {
        const newState = reducer(stateWithNestedItems(), {
          type: "setUi",
          ui: { itemSelector: { zone: "child:slot", index: 0 } },
        });

        expect(newState.ui.itemExpanded).toMatchObject({
          parent: true,
          child: true,
        });
        expect(newState.ui.itemExpanded?.grandchild).toBeUndefined();
      });

      it("should not re-expand a collapsed ancestor when selecting a visible row", () => {
        const newState = executeSequence(stateWithNestedItems(), [
          () => ({
            type: "setUi",
            ui: { itemSelector: { zone: "child:slot", index: 0 } },
          }),
          () => ({
            type: "setUi",
            ui: (previous) => ({
              itemExpanded: { ...previous.itemExpanded, parent: false },
            }),
          }),
          () => ({
            type: "setUi",
            ui: { itemSelector: { zone: "root:slot", index: 0 } },
          }),
        ]);

        expect(newState.ui.itemExpanded?.parent).toEqual(false);
      });

      it("should re-expand collapsed ancestors when the selection hides inside them", () => {
        const newState = executeSequence(stateWithNestedItems(), [
          () => ({
            type: "setUi",
            ui: { itemSelector: { zone: "child:slot", index: 0 } },
          }),
          () => ({
            type: "setUi",
            ui: (previous) => ({
              itemExpanded: { ...previous.itemExpanded, parent: false },
            }),
          }),
          () => ({
            type: "setUi",
            ui: { itemSelector: { zone: "child:slot", index: 0 } },
          }),
        ]);

        expect(newState.ui.itemExpanded).toMatchObject({
          parent: true,
          child: true,
        });
      });

      it("should not touch expansion when the selection is cleared", () => {
        const newState = reducer(stateWithNestedItems(), {
          type: "setUi",
          ui: { itemSelector: null },
        });

        expect(newState.ui.itemExpanded).toEqual({});
      });

      it("should ignore selectors that resolve to nothing", () => {
        const newState = reducer(stateWithNestedItems(), {
          type: "setUi",
          ui: { itemSelector: { zone: "missing:zone", index: 4 } },
        });

        expect(newState.ui.itemExpanded).toEqual({});
      });
    });
  });
});
