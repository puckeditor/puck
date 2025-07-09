import { ComponentData, Config, Data, Slot, UiState } from "../../../types";

import {
  createAppStore,
  defaultAppState as _defaultAppState,
} from "../../../store";
import { PrivateAppState } from "../../../types/Internal";
import { walkAppState } from "../walk-app-state";
import { rootDroppableId } from "../../root-droppable-id";
import { flattenNode } from "../flatten-node";

type Props = {
  Comp: {
    prop: string;
    slotA: Slot;
    slotB: Slot;
    array: { slot: Slot }[];
    object: { slot: Slot };
  };
};

type RootProps = {
  title: string;
  slot: Slot;
};

type UserConfig = Config<Props, RootProps>;
type UserData = Data<Props, RootProps>;

const dzZoneCompound = "my-component:zone1";

const defaultData: UserData = {
  root: { props: { title: "", slot: [] } },
  content: [],
  zones: { [dzZoneCompound]: [] },
};

const defaultUi: UiState = _defaultAppState.ui;

const defaultIndexes: PrivateAppState<UserData>["indexes"] = {
  nodes: {},
  zones: {
    "root:slot": { contentIds: [], type: "slot" },
    [dzZoneCompound]: { contentIds: [], type: "dropzone" },
  },
};

const defaultState = {
  data: defaultData,
  ui: defaultUi,
  indexes: defaultIndexes,
};

const appStore = createAppStore();

describe("walk-app-state", () => {
  const config: UserConfig = {
    root: {
      fields: { title: { type: "text" }, slot: { type: "slot" } },
    },
    components: {
      Comp: {
        fields: {
          prop: { type: "text" },
          slotA: { type: "slot" },
          slotB: { type: "slot" },
          array: { type: "array", arrayFields: { slot: { type: "slot" } } },
          object: { type: "object", objectFields: { slot: { type: "slot" } } },
        },
        defaultProps: {
          prop: "example",
          slotA: [],
          slotB: [],
          array: [],
          object: { slot: [] },
        },
        render: () => <div />,
      },
    },
  };

  const expectIndexed = (
    state: PrivateAppState,
    item: ComponentData | undefined,
    path: string[],
    index: number
  ) => {
    if (!item) return;

    const zoneCompound = path[path.length - 1];

    expect(state.indexes.zones[zoneCompound]?.contentIds[index]).toEqual(
      item.props.id
    );
    expect(state.indexes.nodes[item.props.id].data).toEqual(item);
    expect(state.indexes.nodes[item.props.id].flatData).toEqual(
      flattenNode(item, config)
    );
    expect(state.indexes.nodes[item.props.id].path).toEqual(path);
  };

  beforeEach(() => {
    appStore.setState(
      {
        ...appStore.getInitialState(),
        config,
      },
      true
    );
  });

  it("should generate the correct index for a given payload", () => {
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
                props: {
                  id: "another-id",
                  prop: "Even more example data",
                  slotA: [
                    {
                      type: "Comp",
                      props: { id: "slotted-a-id", prop: "Inside a slot" },
                    },
                  ],
                  slotB: [
                    {
                      type: "Comp",
                      props: { id: "slotted-b-id", prop: "Inside a slot" },
                    },
                  ],
                  array: [
                    {
                      slot: [
                        {
                          type: "Comp",
                          props: {
                            id: "array-slotted-a-id",
                            prop: "Inside a slot, inside an array",
                          },
                        },
                      ],
                    },
                  ],
                  object: {
                    slot: [
                      {
                        type: "Comp",
                        props: {
                          id: "object-slotted-a-id",
                          prop: "Inside a slot, inside an object",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
      config
    );

    expectIndexed(state, state.data.content[0], [rootDroppableId], 0);

    expectIndexed(
      state,
      state.data.zones?.["my-component:zone"][0],
      [rootDroppableId, "my-component:zone"],
      0
    );

    expectIndexed(
      state,
      state.data.zones?.["other-component:zone"][0],
      [rootDroppableId, "my-component:zone", "other-component:zone"],
      0
    );

    expectIndexed(
      state,
      state.data.zones?.["other-component:zone"][0].props.slotA[0],
      [
        rootDroppableId,
        "my-component:zone",
        "other-component:zone",
        "another-id:slotA",
      ],
      0
    );

    expectIndexed(
      state,
      state.data.zones?.["other-component:zone"][0].props.slotB[0],
      [
        rootDroppableId,
        "my-component:zone",
        "other-component:zone",
        "another-id:slotB",
      ],
      0
    );

    expectIndexed(
      state,
      state.data.zones?.["other-component:zone"][0].props.array[0].slot[0],
      [
        rootDroppableId,
        "my-component:zone",
        "other-component:zone",
        "another-id:array[0].slot",
      ],
      0
    );

    expectIndexed(
      state,
      state.data.zones?.["other-component:zone"][0].props.object.slot[0],
      [
        rootDroppableId,
        "my-component:zone",
        "other-component:zone",
        "another-id:object.slot",
      ],
      0
    );

    expect(state.indexes).toMatchInlineSnapshot(`
      {
        "nodes": {
          "another-id": {
            "data": {
              "props": {
                "array": [
                  {
                    "slot": [
                      {
                        "props": {
                          "id": "array-slotted-a-id",
                          "prop": "Inside a slot, inside an array",
                          "slotA": [],
                          "slotB": [],
                        },
                        "type": "Comp",
                      },
                    ],
                  },
                ],
                "id": "another-id",
                "object": {
                  "slot": [
                    {
                      "props": {
                        "id": "object-slotted-a-id",
                        "prop": "Inside a slot, inside an object",
                        "slotA": [],
                        "slotB": [],
                      },
                      "type": "Comp",
                    },
                  ],
                },
                "prop": "Even more example data",
                "slotA": [
                  {
                    "props": {
                      "id": "slotted-a-id",
                      "prop": "Inside a slot",
                      "slotA": [],
                      "slotB": [],
                    },
                    "type": "Comp",
                  },
                ],
                "slotB": [
                  {
                    "props": {
                      "id": "slotted-b-id",
                      "prop": "Inside a slot",
                      "slotA": [],
                      "slotB": [],
                    },
                    "type": "Comp",
                  },
                ],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "array.0.slot": null,
                "id": "another-id",
                "object.slot": null,
                "prop": "Even more example data",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "other-component",
            "path": [
              "root:default-zone",
              "my-component:zone",
              "other-component:zone",
            ],
            "zone": "zone",
          },
          "array-slotted-a-id": {
            "data": {
              "props": {
                "id": "array-slotted-a-id",
                "prop": "Inside a slot, inside an array",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "array-slotted-a-id",
                "prop": "Inside a slot, inside an array",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "another-id",
            "path": [
              "root:default-zone",
              "my-component:zone",
              "other-component:zone",
              "another-id:array[0].slot",
            ],
            "zone": "array[0].slot",
          },
          "my-component": {
            "data": {
              "props": {
                "id": "my-component",
                "prop": "Data",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "my-component",
                "prop": "Data",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "root",
            "path": [
              "root:default-zone",
            ],
            "zone": "default-zone",
          },
          "object-slotted-a-id": {
            "data": {
              "props": {
                "id": "object-slotted-a-id",
                "prop": "Inside a slot, inside an object",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "object-slotted-a-id",
                "prop": "Inside a slot, inside an object",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "another-id",
            "path": [
              "root:default-zone",
              "my-component:zone",
              "other-component:zone",
              "another-id:object.slot",
            ],
            "zone": "object.slot",
          },
          "other-component": {
            "data": {
              "props": {
                "id": "other-component",
                "prop": "More example data",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "other-component",
                "prop": "More example data",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "my-component",
            "path": [
              "root:default-zone",
              "my-component:zone",
            ],
            "zone": "zone",
          },
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
          "slotted-a-id": {
            "data": {
              "props": {
                "id": "slotted-a-id",
                "prop": "Inside a slot",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "slotted-a-id",
                "prop": "Inside a slot",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "another-id",
            "path": [
              "root:default-zone",
              "my-component:zone",
              "other-component:zone",
              "another-id:slotA",
            ],
            "zone": "slotA",
          },
          "slotted-b-id": {
            "data": {
              "props": {
                "id": "slotted-b-id",
                "prop": "Inside a slot",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "slotted-b-id",
                "prop": "Inside a slot",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "another-id",
            "path": [
              "root:default-zone",
              "my-component:zone",
              "other-component:zone",
              "another-id:slotB",
            ],
            "zone": "slotB",
          },
        },
        "zones": {
          "another-id:array[0].slot": {
            "contentIds": [
              "array-slotted-a-id",
            ],
            "type": "slot",
          },
          "another-id:object.slot": {
            "contentIds": [
              "object-slotted-a-id",
            ],
            "type": "slot",
          },
          "another-id:slotA": {
            "contentIds": [
              "slotted-a-id",
            ],
            "type": "slot",
          },
          "another-id:slotB": {
            "contentIds": [
              "slotted-b-id",
            ],
            "type": "slot",
          },
          "array-slotted-a-id:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "array-slotted-a-id:slotB": {
            "contentIds": [],
            "type": "slot",
          },
          "my-component:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "my-component:slotB": {
            "contentIds": [],
            "type": "slot",
          },
          "my-component:zone": {
            "contentIds": [
              "other-component",
            ],
            "type": "dropzone",
          },
          "my-component:zone1": {
            "contentIds": [],
            "type": "dropzone",
          },
          "object-slotted-a-id:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "object-slotted-a-id:slotB": {
            "contentIds": [],
            "type": "slot",
          },
          "other-component:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "other-component:slotB": {
            "contentIds": [],
            "type": "slot",
          },
          "other-component:zone": {
            "contentIds": [
              "another-id",
            ],
            "type": "dropzone",
          },
          "root:default-zone": {
            "contentIds": [
              "my-component",
            ],
            "type": "root",
          },
          "root:slot": {
            "contentIds": [],
            "type": "slot",
          },
          "slotted-a-id:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "slotted-a-id:slotB": {
            "contentIds": [],
            "type": "slot",
          },
          "slotted-b-id:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "slotted-b-id:slotB": {
            "contentIds": [],
            "type": "slot",
          },
        },
      }
    `);
  });

  it("should default values for any undefined slots", () => {
    const state: PrivateAppState = walkAppState(
      {
        ...defaultState,
        data: {
          ...defaultData,
          content: [
            {
              type: "Comp",
              props: {
                id: "another-id",
                prop: "Even more example data",
              },
            },
          ],
          zones: {},
        },
      },
      config
    );

    expect(state.indexes).toMatchInlineSnapshot(`
      {
        "nodes": {
          "another-id": {
            "data": {
              "props": {
                "id": "another-id",
                "prop": "Even more example data",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
            "flatData": {
              "props": {
                "id": "another-id",
                "prop": "Even more example data",
                "slotA": null,
                "slotB": null,
              },
              "type": "Comp",
            },
            "parentId": "root",
            "path": [
              "root:default-zone",
            ],
            "zone": "default-zone",
          },
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
          "another-id:slotA": {
            "contentIds": [],
            "type": "slot",
          },
          "another-id:slotB": {
            "contentIds": [],
            "type": "slot",
          },
          "my-component:zone1": {
            "contentIds": [],
            "type": "dropzone",
          },
          "root:default-zone": {
            "contentIds": [
              "another-id",
            ],
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
