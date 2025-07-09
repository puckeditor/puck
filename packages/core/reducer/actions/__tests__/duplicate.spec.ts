import { Content } from "../../../types";
import { rootDroppableId } from "../../../lib/root-droppable-id";
import {
  defaultData,
  defaultState,
  dzZoneCompound,
  expectIndexed,
  testSetup,
} from "../__helpers__";
import { PrivateAppState } from "../../../types/Internal";
import { walkAppState } from "../../../lib/data/walk-app-state";

describe("Reducer", () => {
  const { executeSequence, config, reducer } = testSetup();

  describe("duplicate action", () => {
    describe("with DropZones", () => {
      it("should duplicate in content", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            id: "sampleId",
          }),
          (state) => ({
            type: "replace",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            data: {
              ...state.indexes.nodes["sampleId"].data,
              props: {
                ...state.indexes.nodes["sampleId"].data.props,
                prop: "Some example data",
              },
            },
          }),
          () => ({
            type: "duplicate",
            sourceZone: rootDroppableId,
            sourceIndex: 0,
          }),
        ]);

        expect(newState.data.content).toHaveLength(2);
        expect(newState.data.content[1].props.id).not.toBe("sampleId");
        expect(newState.data.content[1].props.prop).toBe("Some example data");
        expectIndexed(
          newState,
          newState.data.content[1],
          [rootDroppableId],
          1,
          config
        );
      });

      it("should duplicate in a different zone", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            id: "sampleId",
          }),
          (state) => ({
            type: "replace",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            data: {
              ...state.indexes.nodes["sampleId"].data,
              props: {
                ...state.indexes.nodes["sampleId"].data.props,
                prop: "Some example data",
              },
            },
          }),
          () => ({
            type: "duplicate",
            sourceZone: dzZoneCompound,
            sourceIndex: 0,
          }),
        ]);

        const zone = newState.data.zones?.[dzZoneCompound] ?? [];

        expect(zone).toHaveLength(2);
        expect(zone[1].props.id).not.toBe("sampleId");
        expect(zone[1].props.prop).toBe("Some example data");
        expectIndexed(
          newState,
          zone[1],
          [rootDroppableId, dzZoneCompound],
          1,
          config
        );
      });

      it("should recursively duplicate related items and zones", () => {
        const state: PrivateAppState = walkAppState(
          {
            ...defaultState,
            data: {
              ...defaultData,
              content: [
                {
                  type: "Comp",
                  props: { id: "my-component", prop: "Data" },
                },
              ],
              zones: {
                "my-component:zone": [
                  {
                    type: "Comp",
                    props: { id: "other-component", prop: "More example data" },
                  },
                ],
                "other-component:zone": [
                  {
                    type: "Comp",
                    props: { id: "final-id", prop: "Even more example data" },
                  },
                ],
              },
            },
          },
          config
        );

        const newState = reducer(state, {
          type: "duplicate",
          sourceIndex: 0,
          sourceZone: rootDroppableId,
        });

        const zone1 = newState.data.content ?? [];

        expect(zone1).toHaveLength(2);
        expect(zone1[1].props.id).not.toBe("my-component");
        expect(zone1[1].props.prop).toBe("Data");
        expectIndexed(newState, zone1[1], [rootDroppableId], 1, config);

        const zone2ZoneCompound = `${zone1[1].props.id}:zone`;
        const zone2 = newState.data.zones?.[zone2ZoneCompound] ?? [];

        expect(zone2).toHaveLength(1);
        expect(zone2[0].props.id).not.toBe("other-component");
        expect(zone2[0].props.prop).toBe("More example data");
        expectIndexed(
          newState,
          zone2[0],
          [rootDroppableId, zone2ZoneCompound],
          0,
          config
        );

        const zone3ZoneCompound = `${zone2[0].props.id}:zone`;
        const zone3 = newState.data.zones?.[zone3ZoneCompound] ?? [];

        expect(zone3).toHaveLength(1);
        expect(zone3[0].props.id).not.toBe("final-id");
        expect(zone3[0].props.prop).toBe("Even more example data");
        expectIndexed(
          newState,
          zone3[0],
          [rootDroppableId, zone2ZoneCompound, zone3ZoneCompound],
          0,
          config
        );
      });

      it("should select the duplicated item", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            id: "sampleId",
          }),
          () => ({
            type: "duplicate",
            sourceZone: rootDroppableId,
            sourceIndex: 0,
          }),
        ]);

        expect(newState.ui.itemSelector?.index).toBe(1);
        expect(newState.ui.itemSelector?.zone).toBe(rootDroppableId);
      });
    });
    describe("with slots", () => {
      it("should duplicate within a slot", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "sampleId",
          }),
          (state) => ({
            type: "replace",
            destinationZone: "root:slot",
            destinationIndex: 0,
            data: {
              ...state.indexes.nodes["sampleId"].data,
              props: {
                ...state.indexes.nodes["sampleId"].data.props,
                prop: "Some example data",
              },
            },
          }),
          () => ({
            type: "duplicate",
            sourceZone: "root:slot",
            sourceIndex: 0,
          }),
        ]);

        const content = newState.data.root.props?.slot ?? [];
        expect(content).toHaveLength(2);
        expect(content[1].props.id).not.toBe("sampleId");
        expect(content[1].props.prop).toBe("Some example data");
        expectIndexed(newState, content[1], ["root:slot"], 1, config);
      });

      it("should duplicate within a slot, within a slot", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "first",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "first:slot",
            destinationIndex: 0,
            id: "second",
          }),
          (state) => ({
            type: "replace",
            destinationZone: "first:slot",
            destinationIndex: 0,
            data: {
              ...state.indexes.nodes["second"].data,
              props: {
                ...state.indexes.nodes["second"].data.props,
                prop: "Some example data",
              },
            },
          }),
          () => ({
            type: "duplicate",
            sourceZone: "first:slot",
            sourceIndex: 0,
          }),
        ]);

        const content = (newState.data.root.props?.slot ?? [])[0].props
          .slot as Content;
        expect(content).toHaveLength(2);
        expect(content[1].props.id).not.toBe("second");
        expect(content[1].props.prop).toBe("Some example data");
        expectIndexed(
          newState,
          content[1],
          ["root:slot", "first:slot"],
          1,
          config
        );
      });

      it("should duplicate within a slot, within a DropZone", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            id: "first",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "first:slot",
            destinationIndex: 0,
            id: "second",
          }),
          (state) => ({
            type: "replace",
            destinationZone: "first:slot",
            destinationIndex: 0,
            data: {
              ...state.indexes.nodes["second"].data,
              props: {
                ...state.indexes.nodes["second"].data.props,
                prop: "Some example data",
              },
            },
          }),
          () => ({
            type: "duplicate",
            sourceZone: "first:slot",
            sourceIndex: 0,
          }),
        ]);

        const content =
          newState.data.zones?.[dzZoneCompound][0].props.slot || [];

        expect(content).toHaveLength(2);
        expect(content[1].props.id).not.toBe("second");
        expect(content[1].props.prop).toBe("Some example data");
        expectIndexed(
          newState,
          content[1],
          [rootDroppableId, dzZoneCompound, "first:slot"],
          1,
          config
        );
      });

      it("should recursively duplicate related items", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "first",
          }),
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "first:slot",
            destinationIndex: 0,
            id: "second",
          }),
          (state) => ({
            type: "replace",
            destinationZone: "first:slot",
            destinationIndex: 0,
            data: {
              ...state.indexes.nodes["second"].data,
              props: {
                ...state.indexes.nodes["second"].data.props,
                prop: "Some example data",
              },
            },
          }),
          () => ({
            type: "duplicate",
            sourceZone: "root:slot",
            sourceIndex: 0,
          }),
        ]);

        const zone1 = newState.data.root.props?.slot ?? [];
        expect(zone1).toHaveLength(2);
        expect(zone1[1].props.id).not.toBe("second");
        expectIndexed(newState, zone1[1], ["root:slot"], 1, config);

        const zone2ZoneCompound = `${zone1[1].props.id}:slot`;
        const zone2 = zone1[1].props.slot ?? [];

        expect(zone2).toHaveLength(1);
        expect(zone2[0].props.id).not.toBe("second");
        expect(zone2[0].props.prop).toBe("Some example data");
        expectIndexed(
          newState,
          zone2[0],
          ["root:slot", zone2ZoneCompound],
          0,
          config
        );
      });

      it("should select the duplicated item", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "sampleId",
          }),
          () => ({
            type: "duplicate",
            sourceZone: "root:slot",
            sourceIndex: 0,
          }),
        ]);

        expect(newState.ui.itemSelector?.index).toBe(1);
        expect(newState.ui.itemSelector?.zone).toBe("root:slot");
      });
    });
  });
});
