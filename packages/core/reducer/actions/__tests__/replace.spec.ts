import { rootDroppableId } from "../../../lib/root-droppable-id";
import {
  defaultState,
  dzZoneCompound,
  expectIndexed,
  testSetup,
} from "../__helpers__";

describe("Reducer", () => {
  const { executeSequence } = testSetup();

  describe("replace action", () => {
    describe("with DropZones", () => {
      it("should replace in content", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "replace",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            data: {
              type: "Comp",
              props: {
                id: "1",
                prop: "Changed",
              },
            },
          }),
        ]);

        expect(newState.data.content.length).toBe(1);
        expect(newState.data.content[0].props.prop).toBe("Changed");
        expectIndexed(newState, newState.data.content[0], [rootDroppableId], 0);
      });

      it("should replace in a zone", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "replace",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            data: {
              type: "Comp",
              props: {
                id: "1",
                prop: "Changed",
              },
            },
          }),
        ]);

        expect(newState.data.zones?.[dzZoneCompound].length).toBe(1);
        expect(newState.data.zones?.[dzZoneCompound][0].props.prop).toBe(
          "Changed"
        );
        expectIndexed(newState, newState.data.content[0], [rootDroppableId], 0);
      });
    });

    describe("with slots", () => {
      it("should replace in deep slots", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "replace",
            destinationZone: "root:slot",
            destinationIndex: 0,
            data: {
              type: "CompWithDefaults",
              props: { id: "1", slot: [{ type: "Comp", props: {} }] },
            },
          }),
        ]);

        const item = newState.data.root.props?.slot[0];

        expect(newState.data.root.props?.slot.length).toBe(1);
        expect(item?.props.id).toBe("1");
        expect(item?.props.slot[0].props.id).toBe("mockId-1");
        expectIndexed(newState, item, ["root:slot"], 0);
      });

      it("should replace when slot removed from array", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "replace",
            destinationZone: "root:slot",
            destinationIndex: 0,
            data: {
              type: "CompWithDefaults",
              props: {
                id: "1",
                slot: [],
                slotArray: [
                  { slot: [{ type: "Comp", props: {} }] },
                  { slot: [{ type: "Comp", props: {} }] },
                ],
              },
            },
          }),
        ]);

        const item = newState.data.root.props?.slot[0];

        const slottedItem1 = item?.props.slotArray[0].slot[0];
        const slottedItem2 = item?.props.slotArray[1].slot[0];

        expectIndexed(
          newState,
          slottedItem1,
          ["root:slot", "1:slotArray[0].slot"],
          0
        );
        expectIndexed(
          newState,
          slottedItem2,
          ["root:slot", "1:slotArray[1].slot"],
          0
        );

        const removedState = executeSequence(newState, [
          () => ({
            type: "replace",
            destinationZone: "root:slot",
            destinationIndex: 0,
            data: {
              type: "CompWithDefaults",
              props: {
                id: "1",
                slot: [],
                slotArray: [{ slot: [slottedItem1] }],
              },
            },
          }),
        ]);

        expectIndexed(
          removedState,
          slottedItem1,
          ["root:slot", "1:slotArray[0].slot"],
          0
        );

        expect(
          removedState.indexes.zones["1:slotArray[1].slot"]
        ).toBeUndefined();
      });
    });
  });
});
