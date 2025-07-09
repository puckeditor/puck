import { rootDroppableId } from "../../../lib/root-droppable-id";
import {
  defaultState,
  dzZoneCompound,
  expectIndexed,
  testSetup,
} from "../__helpers__";

describe("Reducer", () => {
  const { executeSequence } = testSetup();

  describe("reorder action", () => {
    describe("with DropZones", () => {
      it("should reorder within rootDroppableId", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 1,
            id: "2",
          }),
          () => ({
            type: "reorder",
            sourceIndex: 0,
            destinationIndex: 1,
            destinationZone: rootDroppableId,
          }),
        ]);

        expect(newState.data.content[0].props.id).toBe("2");
        expect(newState.data.content[1].props.id).toBe("1");
        expectIndexed(newState, newState.data.content[0], [rootDroppableId], 0);
        expectIndexed(newState, newState.data.content[1], [rootDroppableId], 1);
      });

      it("should reorder within a different zone", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 1,
            id: "2",
          }),
          () => ({
            type: "reorder",
            sourceIndex: 0,
            destinationIndex: 1,
            destinationZone: dzZoneCompound,
          }),
        ]);

        expect(newState.data.zones?.[dzZoneCompound][0].props.id).toBe("2");
        expect(newState.data.zones?.[dzZoneCompound][1].props.id).toBe("1");
        expectIndexed(
          newState,
          newState.data.content[0],
          [rootDroppableId, dzZoneCompound],
          0
        );
        expectIndexed(
          newState,
          newState.data.content[1],
          [rootDroppableId, dzZoneCompound],
          1
        );
      });
    });

    describe("with slots", () => {
      it("should reorder within a slot", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 1,
            id: "2",
          }),
          () => ({
            type: "reorder",
            sourceIndex: 0,
            destinationIndex: 1,
            destinationZone: "root:slot",
          }),
        ]);

        expect(newState.data.root.props?.slot[0].props.id).toBe("2");
        expect(newState.data.root.props?.slot[1].props.id).toBe("1");
        expectIndexed(
          newState,
          newState.data.root.props?.slot[0],
          ["root:slot"],
          0
        );
        expectIndexed(
          newState,
          newState.data.root.props?.slot[1],
          ["root:slot"],
          1
        );
      });
    });
  });
});
