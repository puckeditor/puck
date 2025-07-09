import { rootDroppableId } from "../../../lib/root-droppable-id";
import {
  defaultState,
  dzZoneCompound,
  expectIndexed,
  testSetup,
} from "../__helpers__";

describe("Reducer", () => {
  const { executeSequence } = testSetup();

  describe("move action", () => {
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
            type: "move",
            sourceIndex: 0,
            sourceZone: rootDroppableId,
            destinationIndex: 1,
            destinationZone: rootDroppableId,
          }),
        ]);

        expect(newState.data.content[0].props.id).toBe("2");
        expect(newState.data.content[1].props.id).toBe("1");
        expectIndexed(newState, newState.data.content[0], [rootDroppableId], 0);
        expectIndexed(newState, newState.data.content[1], [rootDroppableId], 1);
      });

      it("should move items between zones", () => {
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
            type: "move",
            sourceIndex: 1,
            sourceZone: dzZoneCompound,
            destinationIndex: 0,
            destinationZone: rootDroppableId,
          }),
        ]);

        expect(newState.data.zones?.[dzZoneCompound][0].props.id).toBe("1");
        expect(newState.data.content[0].props.id).toBe("2");
        expectIndexed(
          newState,
          newState.data.zones?.[dzZoneCompound][0],
          [rootDroppableId, dzZoneCompound],
          0
        );
        expectIndexed(newState, newState.data.content[0], [rootDroppableId], 0);
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
            type: "move",
            sourceIndex: 0,
            sourceZone: "root:slot",
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

      it("should move items from a deep slot to a zone", () => {
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
            destinationZone: "1:slot",
            destinationIndex: 0,
            id: "2",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "2:slot",
            destinationIndex: 0,
            id: "3",
          }),
          () => ({
            type: "move",
            sourceIndex: 0,
            sourceZone: "1:slot",
            destinationIndex: 1,
            destinationZone: dzZoneCompound,
          }),
        ]);

        const item1 = newState.data.root.props?.slot[0];
        const item2 = newState.data.zones?.[dzZoneCompound][0];
        const item3 = newState.data.zones?.[dzZoneCompound][0].props?.slot[0];

        expect(item1?.props.id).toBe("1");
        expectIndexed(newState, item1, ["root:slot"], 0);

        expect(item2?.props?.id).toBe("2");
        expectIndexed(newState, item2, [rootDroppableId, dzZoneCompound], 0);

        expect(item3?.props.id).toBe("3");
        expectIndexed(
          newState,
          item3,
          [rootDroppableId, dzZoneCompound, "2:slot"],
          0
        );
      });
    });
  });
});
