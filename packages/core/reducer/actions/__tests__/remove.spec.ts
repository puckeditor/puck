import { RemoveAction } from "../..";
import { rootDroppableId } from "../../../lib/root-droppable-id";
import { walkAppState } from "../../../lib/data/walk-app-state";
import { PrivateAppState } from "../../../types/Internal";
import {
  defaultData,
  defaultState,
  dzZoneCompound,
  testSetup,
} from "../__helpers__";

describe("Reducer", () => {
  const { executeSequence, config, reducer } = testSetup();

  describe("remove action", () => {
    describe("with DropZones", () => {
      it("should remove from content", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: rootDroppableId,
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "remove",
            index: 0,
            zone: rootDroppableId,
          }),
        ]);

        expect(newState.data.content).toHaveLength(0);
        expect(newState.indexes.nodes["1"]).toBeUndefined();
        expect(newState.indexes.zones[rootDroppableId].contentIds).toEqual([]);
      });

      it("should remove from a zone", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: dzZoneCompound,
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "remove",
            index: 0,
            zone: dzZoneCompound,
          }),
        ]);

        expect(newState.data.zones?.[dzZoneCompound]).toHaveLength(0);
        expect(newState.indexes.nodes["1"]).toBeUndefined();
        expect(newState.indexes.zones[dzZoneCompound].contentIds).toEqual([]);
      });

      it("should recursively remove items", () => {
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

        const action: RemoveAction = {
          type: "remove",
          index: 0,
          zone: rootDroppableId,
        };

        const newState = reducer(state, action);

        expect(newState.data).toMatchInlineSnapshot(`
          {
            "content": [],
            "root": {
              "props": {
                "slot": [],
                "title": "",
              },
            },
            "zones": {},
          }
        `);

        expect(newState.indexes).toMatchInlineSnapshot(`
          {
            "nodes": {
              "root": {
                "data": {
                  "props": {
                    "id": "root",
                    "slot": [],
                    "title": "",
                  },
                  "type": "root",
                },
                "flatData": {
                  "props": {
                    "id": "root",
                    "slot": null,
                    "title": "",
                  },
                  "type": "root",
                },
                "parentId": null,
                "path": [],
                "zone": "",
              },
            },
            "zones": {
              "root:default-zone": {
                "contentIds": [],
                "type": "root",
              },
              "root:slot": {
                "contentIds": [],
                "type": "slot",
              },
            },
          }
        `);
      });
    });

    describe("with slots", () => {
      it("should remove from a slot", () => {
        const newState = executeSequence(defaultState, [
          () => ({
            type: "insert",
            componentType: "Comp",
            destinationZone: "root:slot",
            destinationIndex: 0,
            id: "1",
          }),
          () => ({
            type: "remove",
            index: 0,
            zone: "root:slot",
          }),
        ]);

        expect(newState.data.content).toHaveLength(0);
        expect(newState.indexes.nodes["1"]).toBeUndefined();
        expect(newState.indexes.zones["root:slot"].contentIds).toEqual([]);
      });

      it("should recursively remove items in a slot", () => {
        const state: PrivateAppState = walkAppState(
          {
            ...defaultState,
            data: {
              ...defaultData,
              root: {
                props: {
                  slot: [
                    {
                      type: "Comp",
                      props: {
                        id: "my-component",
                        prop: "Data",
                        slot: [
                          {
                            type: "Comp",
                            props: {
                              id: "final-id",
                              prop: "Even more example data",
                            },
                          },
                        ],
                      },
                    },
                  ],
                } as any,
              },
            },
          },
          config
        );

        const action: RemoveAction = {
          type: "remove",
          index: 0,
          zone: "root:slot",
        };

        const newState = reducer(state, action);

        expect(newState.data).toMatchInlineSnapshot(`
          {
            "content": [],
            "root": {
              "props": {
                "slot": [],
              },
            },
            "zones": {},
          }
        `);

        expect(newState.indexes).toMatchInlineSnapshot(`
          {
            "nodes": {
              "root": {
                "data": {
                  "props": {
                    "id": "root",
                    "slot": [],
                  },
                  "type": "root",
                },
                "flatData": {
                  "props": {
                    "id": "root",
                    "slot": null,
                  },
                  "type": "root",
                },
                "parentId": null,
                "path": [],
                "zone": "",
              },
            },
            "zones": {
              "root:default-zone": {
                "contentIds": [],
                "type": "root",
              },
              "root:slot": {
                "contentIds": [],
                "type": "slot",
              },
            },
          }
        `);
      });

      it("should remove items deep within a slot", () => {
        const state: PrivateAppState = walkAppState(
          {
            ...defaultState,
            data: {
              ...defaultData,
              root: {
                props: {
                  slot: [
                    {
                      type: "Comp",
                      props: {
                        id: "my-component",
                        prop: "Data",
                        slot: [
                          {
                            type: "Comp",
                            props: {
                              id: "final-id",
                              prop: "Even more example data",
                            },
                          },
                        ],
                      },
                    },
                  ],
                } as any,
              },
            },
          },
          config
        );

        const action: RemoveAction = {
          type: "remove",
          index: 0,
          zone: "my-component:slot",
        };

        const newState = reducer(state, action);

        expect(newState.data).toMatchInlineSnapshot(`
          {
            "content": [],
            "root": {
              "props": {
                "slot": [
                  {
                    "props": {
                      "id": "my-component",
                      "prop": "Data",
                      "slot": [],
                    },
                    "type": "Comp",
                  },
                ],
              },
            },
            "zones": {
              "my-component:zone1": [],
            },
          }
        `);

        expect(newState.indexes).toMatchInlineSnapshot(`
          {
            "nodes": {
              "my-component": {
                "data": {
                  "props": {
                    "id": "my-component",
                    "prop": "Data",
                    "slot": [],
                  },
                  "type": "Comp",
                },
                "flatData": {
                  "props": {
                    "id": "my-component",
                    "prop": "Data",
                    "slot": null,
                  },
                  "type": "Comp",
                },
                "parentId": "root",
                "path": [
                  "root:slot",
                ],
                "zone": "slot",
              },
              "root": {
                "data": {
                  "props": {
                    "id": "root",
                    "slot": [
                      {
                        "props": {
                          "id": "my-component",
                          "prop": "Data",
                          "slot": [],
                        },
                        "type": "Comp",
                      },
                    ],
                  },
                  "type": "root",
                },
                "flatData": {
                  "props": {
                    "id": "root",
                    "slot": null,
                  },
                  "type": "root",
                },
                "parentId": null,
                "path": [],
                "zone": "",
              },
            },
            "zones": {
              "my-component:slot": {
                "contentIds": [],
                "type": "slot",
              },
              "my-component:zone1": {
                "contentIds": [],
                "type": "dropzone",
              },
              "root:default-zone": {
                "contentIds": [],
                "type": "root",
              },
              "root:slot": {
                "contentIds": [
                  "my-component",
                ],
                "type": "slot",
              },
            },
          }
        `);
      });

      it("should recursively remove items in a slot within a DropZone", () => {
        const state: PrivateAppState = walkAppState(
          {
            ...defaultState,
            data: {
              ...defaultData,
              content: [
                {
                  type: "Comp",
                  props: {
                    id: "my-component",
                    prop: "Data",
                    slot: [
                      {
                        type: "Comp",
                        props: {
                          id: "final-id",
                          prop: "Even more example data",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          config
        );

        const action: RemoveAction = {
          type: "remove",
          index: 0,
          zone: rootDroppableId,
        };

        const newState = reducer(state, action);

        expect(newState.data).toMatchInlineSnapshot(`
          {
            "content": [],
            "root": {
              "props": {
                "slot": [],
                "title": "",
              },
            },
            "zones": {},
          }
        `);

        expect(newState.indexes).toMatchInlineSnapshot(`
          {
            "nodes": {
              "root": {
                "data": {
                  "props": {
                    "id": "root",
                    "slot": [],
                    "title": "",
                  },
                  "type": "root",
                },
                "flatData": {
                  "props": {
                    "id": "root",
                    "slot": null,
                    "title": "",
                  },
                  "type": "root",
                },
                "parentId": null,
                "path": [],
                "zone": "",
              },
            },
            "zones": {
              "root:default-zone": {
                "contentIds": [],
                "type": "root",
              },
              "root:slot": {
                "contentIds": [],
                "type": "slot",
              },
            },
          }
        `);
      });
    });

    it("should deselect the item", () => {
      const newState = executeSequence(defaultState, [
        () => ({
          type: "insert",
          componentType: "Comp",
          destinationZone: "root:slot",
          destinationIndex: 0,
          id: "1",
        }),
        () => ({
          type: "remove",
          index: 0,
          zone: "root:slot",
        }),
      ]);

      expect(newState.ui.itemSelector).toBeNull();
    });
  });
});
