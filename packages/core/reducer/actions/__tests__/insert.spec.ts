import { rootDroppableId } from "../../../lib/root-droppable-id";
import {
  defaultState,
  dzZoneCompound,
  expectIndexed,
  testSetup,
  UserData,
} from "../__helpers__";
import { PrivateAppState } from "../../../types/Internal";
import { InsertAction } from "../../actions";

describe("Reducer", () => {
  const { executeSequence, reducer } = testSetup();

  describe("insert action", () => {
    describe("with DropZones", () => {
      it("should insert into rootDroppableId", () => {
        const action: InsertAction = {
          type: "insert",
          componentType: "Comp",
          destinationIndex: 0,
          destinationZone: rootDroppableId,
        };

        const newState = reducer(defaultState, action);
        const item = newState.data.content[0];

        expect(item).toHaveProperty("type", "Comp");
        expect(item.props).toHaveProperty("prop", "example");
        expectIndexed(newState, item, [rootDroppableId], 0);
      });

      it("should insert into a different zone", () => {
        const action: InsertAction = {
          type: "insert",
          componentType: "Comp",
          destinationIndex: 0,
          destinationZone: dzZoneCompound,
        };

        const state = reducer(defaultState, action);

        const item = state.data.zones?.[dzZoneCompound][0];

        expect(item).toHaveProperty("type", "Comp");
        expect(item?.props).toHaveProperty("prop", "example");
        expectIndexed(state, item, [rootDroppableId, dzZoneCompound], 0);
      });
    });

    describe("with slots", () => {
      it("should insert into a root slot", () => {
        const state: PrivateAppState<UserData> = defaultState;

        const action: InsertAction = {
          type: "insert",
          componentType: "Comp",
          destinationIndex: 0,
          destinationZone: "root:slot",
        };

        const newState = reducer(state, action) as PrivateAppState<UserData>;

        const item = newState.data.root.props?.slot[0];

        expect(item).toHaveProperty("type", "Comp");
        expect(item?.props).toHaveProperty("prop", "example");
        expectIndexed(newState, item, ["root:slot"], 0);
      });

      it("should load components defined in defaultProps", () => {
        const state: PrivateAppState<UserData> = defaultState;

        const action: InsertAction = {
          type: "insert",
          componentType: "CompWithDefaults",
          destinationIndex: 0,
          destinationZone: "root:slot",
          id: "first",
        };

        const newState = reducer(state, action) as PrivateAppState<UserData>;

        const item = newState.data.root.props?.slot[0];
        const defaultedItem = newState.data.root.props?.slot[0].props.slot[0];

        expect(item).toHaveProperty("type", "CompWithDefaults");
        expect(defaultedItem?.props).toHaveProperty("prop", "Defaulted item");
        expect(defaultedItem?.props.id).toEqual("mockId-1");
        expectIndexed(newState, defaultedItem, ["root:slot", "first:slot"], 0);
      });

      it("should insert into a slot within a slot", () => {
        const state = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationIndex: 0,
            destinationZone: "root:slot",
          }),
          (state) => ({
            type: "insert",
            componentType: "Comp",
            destinationIndex: 0,
            destinationZone: `${state.data.root.props?.slot[0].props?.id}:slot`,
          }),
        ]);

        const item = state.data.root.props?.slot[0]?.props.slot[0];

        expect(item).toHaveProperty("type", "Comp");
        expect(item?.props).toHaveProperty("prop", "example");
        expectIndexed(
          state,
          item,
          ["root:slot", `${state.data.root.props?.slot[0].props?.id}:slot`],
          0
        );
      });

      it("should insert into a slot within a DropZone", () => {
        const state = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationIndex: 0,
            destinationZone: dzZoneCompound,
          }),
          (state) => ({
            type: "insert",
            componentType: "Comp",
            destinationIndex: 0,
            destinationZone: `${state.data.zones?.[dzZoneCompound][0]?.props.id}:slot`,
          }),
        ]);

        const item = state.data.zones?.[dzZoneCompound][0];

        expect(item).toHaveProperty("type", "Comp");
        expect(item?.props).toHaveProperty("prop", "example");
        expectIndexed(state, item, [rootDroppableId, dzZoneCompound], 0);
      });
    });
  });
});
