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
import { useClipboardStore } from "../../../lib/clipboard-store";

describe("Reducer", () => {
  const { executeSequence, config, reducer } = testSetup();

  beforeEach(() => {
    // Clear clipboard before each test
    useClipboardStore.getState().clear();
  });

  describe("copy action", () => {
    describe("with DropZones", () => {
      it("should copy component to clipboard", () => {
        const initialState = executeSequence(defaultState, [
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
        ]);

        const newState = reducer(initialState, {
          type: "copy",
          sourceIndex: 0,
          sourceZone: rootDroppableId,
        });

        // Copy action should not modify the state
        expect(newState).toEqual(initialState);
      });
    });
  });

  describe("cut action", () => {
    describe("with DropZones", () => {
      it("should cut component to clipboard and remove from state", () => {
        const initialState = executeSequence(defaultState, [
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
        ]);

        const newState = reducer(initialState, {
          type: "cut",
          sourceIndex: 0,
          sourceZone: rootDroppableId,
        });

        // Item should be removed from state
        expect(newState.data.content).toHaveLength(0);
        
        // Item should be in clipboard
        const clipboardData = useClipboardStore.getState().clipboardData;
        expect(clipboardData.component).toBeTruthy();
        expect(clipboardData.component?.props.prop).toBe("Some example data");
      });

      it("should cut from a different zone", () => {
        const initialState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            id: "sampleId",
          }),
        ]);

        const newState = reducer(initialState, {
          type: "cut",
          sourceIndex: 0,
          sourceZone: dzZoneCompound,
        });

        const zone = newState.data.zones?.[dzZoneCompound] ?? [];
        expect(zone).toHaveLength(0);
        
        // Item should be in clipboard
        const clipboardData = useClipboardStore.getState().clipboardData;
        expect(clipboardData.component).toBeTruthy();
      });
    });
  });

  describe("paste action", () => {
    describe("with DropZones", () => {
      it("should paste component from clipboard", () => {
        // First setup initial state with a component
        const stateWithComponent = executeSequence(defaultState, [
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
        ]);

        // Copy the component
        reducer(stateWithComponent, {
          type: "copy",
          sourceIndex: 0,
          sourceZone: rootDroppableId,
        });

        // Paste the component
        const newState = reducer(stateWithComponent, {
          type: "paste",
          destinationIndex: 1,
          destinationZone: rootDroppableId,
        });

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

      it("should select the pasted item", () => {
        const stateWithComponent = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            id: "sampleId",
          }),
        ]);

        // Copy and paste
        reducer(stateWithComponent, {
          type: "copy",
          sourceIndex: 0,
          sourceZone: rootDroppableId,
        });

        const newState = reducer(stateWithComponent, {
          type: "paste",
          destinationIndex: 1,
          destinationZone: rootDroppableId,
        });

        expect(newState.ui.itemSelector?.index).toBe(1);
        expect(newState.ui.itemSelector?.zone).toBe(rootDroppableId);
      });
    });

    describe("with slots", () => {
      it("should paste within a slot", () => {
        const stateWithComponent = executeSequence(defaultState, [
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
        ]);

        // Copy and paste
        reducer(stateWithComponent, {
          type: "copy",
          sourceIndex: 0,
          sourceZone: "root:slot",
        });

        const newState = reducer(stateWithComponent, {
          type: "paste",
          destinationIndex: 1,
          destinationZone: "root:slot",
        });

        const content = (newState.data.root.props as any)?.slot ?? [];
        expect(content).toHaveLength(2);
        expect(content[1].props.id).not.toBe("sampleId");
        expect(content[1].props.prop).toBe("Some example data");
        expectIndexed(newState, content[1], ["root:slot"], 1, config);
      });
    });
  });
});
