import { Config, Data, Slot } from "../../../types";

import { defaultAppState as _defaultAppState } from "../../../store";

import { walkTree } from "../walk-tree";

type Props = {
  Comp: {
    prop: string;
    slotA?: Slot;
    slotB?: Slot;
  };
};

type RootProps = {
  title: string;
  slot: Slot;
};

type UserConfig = Config<Props, RootProps>;
type UserData = Data<Props, RootProps>;

const testData: UserData = {
  root: { props: { title: "", slot: [] } },
  content: [
    {
      type: "Comp",
      props: { id: "my-component", prop: "Data", slotA: [], slotB: [] },
    },
  ],
  zones: {
    "my-component:zone": [
      {
        type: "Comp",
        props: {
          id: "other-component",
          prop: "More example data",
          slotA: [],
          slotB: [],
        },
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
              props: {
                id: "slotted-a-id",
                prop: "Inside a slot",
                slotA: [],
                slotB: [],
              },
            },
          ],
          slotB: [
            {
              type: "Comp",
              props: {
                id: "slotted-b-id",
                prop: "Inside a slot",
                slotA: [],
                slotB: [],
              },
            },
          ],
        },
      },
    ],
  },
};

describe("walk-tree", () => {
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
        },
        defaultProps: { prop: "example", slotA: [], slotB: [] },
        render: () => <div />,
      },
    },
  };

  it("should trigger a function for each slot for a given Data", () => {
    const mockMap = jest.fn();

    const data = walkTree(testData, config, mockMap);

    expect(data).toEqual(testData);

    expect(mockMap).toHaveBeenCalledWith([], {
      parentId: "root",
      propName: "slot",
    });

    expect(mockMap).toHaveBeenCalledWith(
      [
        {
          props: {
            id: "slotted-a-id",
            prop: "Inside a slot",
            slotA: [],
            slotB: [],
          },
          type: "Comp",
        },
      ],
      { parentId: "another-id", propName: "slotA" }
    );

    expect(mockMap).toHaveBeenCalledWith(
      [
        {
          props: {
            id: "slotted-b-id",
            prop: "Inside a slot",
            slotA: [],
            slotB: [],
          },
          type: "Comp",
        },
      ],
      { parentId: "another-id", propName: "slotB" }
    );
  });

  it("should trigger a function for each slot for a given ComponentData", () => {
    const mockMap = jest.fn();

    const zones = testData.zones ?? {};
    const item = zones["other-component:zone"][0];

    const data = walkTree(item, config, mockMap);

    expect(data).toEqual(item);

    expect(mockMap).toHaveBeenCalledWith(
      [
        {
          props: {
            id: "slotted-a-id",
            prop: "Inside a slot",
            slotA: [],
            slotB: [],
          },
          type: "Comp",
        },
      ],
      { parentId: "another-id", propName: "slotA" }
    );

    expect(mockMap).toHaveBeenCalledWith(
      [
        {
          props: {
            id: "slotted-b-id",
            prop: "Inside a slot",
            slotA: [],
            slotB: [],
          },
          type: "Comp",
        },
      ],
      { parentId: "another-id", propName: "slotB" }
    );
  });

  it("should map each item for each slot for a given Data", () => {
    const data = walkTree(testData, config, (content) =>
      content.map((item) => ({
        ...item,
        props: { ...item.props, example: "Hello, world" },
      }))
    );

    expect(data).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "props": {
              "example": "Hello, world",
              "id": "my-component",
              "prop": "Data",
              "slotA": [],
              "slotB": [],
            },
            "type": "Comp",
          },
        ],
        "root": {
          "props": {
            "slot": [],
            "title": "",
          },
        },
        "zones": {
          "my-component:zone": [
            {
              "props": {
                "id": "other-component",
                "prop": "More example data",
                "slotA": [],
                "slotB": [],
              },
              "type": "Comp",
            },
          ],
          "other-component:zone": [
            {
              "props": {
                "id": "another-id",
                "prop": "Even more example data",
                "slotA": [
                  {
                    "props": {
                      "example": "Hello, world",
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
                      "example": "Hello, world",
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
          ],
        },
      }
    `);
  });

  it("should map each item for each slot for a given ComponentData", () => {
    const zones = testData.zones ?? {};
    const item = zones["other-component:zone"][0];

    const data = walkTree(item, config, (content) =>
      content.map((item) => ({
        ...item,
        props: { ...item.props, example: "Hello, world" },
      }))
    );

    expect(data).toMatchInlineSnapshot(`
      {
        "props": {
          "id": "another-id",
          "prop": "Even more example data",
          "slotA": [
            {
              "props": {
                "example": "Hello, world",
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
                "example": "Hello, world",
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
      }
    `);
  });

  it("should trigger a function for each array slot for a given Data", () => {
    const config: Config = {
      components: {
        Comp: {
          fields: {
            prop: { type: "text" },
            array: {
              type: "array",
              arrayFields: { arraySlot: { type: "slot" } },
            },
          },
          render: () => <div />,
        },
      },
    };

    const testData: Data = {
      root: { props: {} },
      content: [
        {
          type: "Comp",
          props: {
            id: "my-component",
            array: [
              {
                arraySlot: [
                  {
                    type: "Comp",
                    props: {
                      id: "slotted-array-id",
                      prop: "Inside array slot",
                      slotA: [],
                      slotB: [],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
      zones: {},
    };

    const mockMap = jest.fn();

    const data = walkTree(testData, config, mockMap);

    expect(data).toEqual(testData);

    expect(mockMap).toHaveBeenCalledWith(
      [
        {
          props: {
            id: "slotted-array-id",
            prop: "Inside array slot",
            slotA: [],
            slotB: [],
          },
          type: "Comp",
        },
      ],
      { parentId: "my-component", propName: "array[0].arraySlot" }
    );
  });
});
