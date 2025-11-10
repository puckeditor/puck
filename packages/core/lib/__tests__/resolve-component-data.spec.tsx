import { resolveComponentData, cache } from "../resolve-component-data";
import { createAppStore } from "../../store";
import { Config, Fields, Slot } from "../../types";
import { toComponent } from "../data/to-component";

// export the cache and manually reset it or dynamically import the file

const appStore = createAppStore();

interface ComponentProps {
  prop: string;
  slot: Slot;
  object: { slot: Slot };
}

const myComponentFields: Fields<ComponentProps> = {
  prop: { type: "text" },
  slot: {
    type: "slot",
  },
  object: {
    type: "object",
    objectFields: {
      slot: {
        type: "slot",
      },
    },
  },
};

const rootResolveData = jest.fn((rootData) => {
  return {
    ...rootData,
    props: {
      title: "Resolved title",
      slot: [
        {
          type: "MyComponentWithResolver",
          props: { id: "123456789", prop: "Not yet resolved" },
        },
      ],
      object: {
        slot: [
          {
            type: "MyComponentWithResolver",
            props: { id: "987654321", prop: "Not yet resolved" },
          },
        ],
      },
      array: [
        {
          slot: [
            {
              type: "MyComponentWithResolver",
              props: { id: "987654321", prop: "Not yet resolved" },
            },
          ],
        },
      ],
    },
    readOnly: { title: true },
  };
});

const componentResolveData = jest.fn(({ props }, { parent }) => {
  return {
    props: {
      ...props,
      prop: "Hello, world",
    },
    readOnly: { prop: true },
  };
});

const config: Config<{
  root: {
    title: string;
    object: { slot: Slot };
    slot: Slot;
    array: { slot: Slot }[];
  };
}> = {
  root: {
    fields: {
      title: { type: "text" },
      object: { type: "object", objectFields: { slot: { type: "slot" } } },
      slot: { type: "slot" },
      array: {
        type: "array",
        arrayFields: {
          slot: {
            type: "slot",
          },
        },
      },
    },
    resolveData: rootResolveData,
  },
  components: {
    MyComponentWithResolver: {
      fields: myComponentFields,
      resolveData: componentResolveData,
      render: () => <div />,
    },
    MyComponentWithoutResolver: {
      fields: myComponentFields,
      render: () => <div />,
    },
  },
};

describe("resolveComponentData", () => {
  beforeEach(() => {
    cache.lastChange = {};
    appStore.setState({ ...appStore.getInitialState(), config }, true);
    jest.clearAllMocks();
  });

  it("should run resolvers for every node in the tree", async () => {
    const { node: newRoot, didChange } = await resolveComponentData(
      toComponent(appStore.getState().state.data.root),
      appStore.getState().config
    );

    expect(newRoot.props?.title).toBe("Resolved title");
    expect(newRoot.readOnly?.title).toBe(true);
    expect(newRoot.props.slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.slot[0].readOnly.prop).toBe(true);
    expect(newRoot.props.object.slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.object.slot[0].readOnly.prop).toBe(true);
    expect(newRoot.props.array[0].slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.array[0].slot[0].readOnly.prop).toBe(true);
    expect(didChange).toBe(true);
  });

  it("should run child resolvers even if parent doesn't have one", async () => {
    const { node: newRoot, didChange } = await resolveComponentData(
      toComponent({
        type: "MyComponentWithoutResolver",
        props: {
          title: "Resolved title",
          slot: [
            {
              type: "MyComponentWithResolver",
              props: { id: "123456789", prop: "Not yet resolved" },
            },
          ],
          object: {
            slot: [
              {
                type: "MyComponentWithResolver",
                props: { id: "987654321", prop: "Not yet resolved" },
              },
            ],
          },
        },
      }),
      appStore.getState().config
    );

    expect(newRoot.props?.title).toBe("Resolved title");
    expect(newRoot.props.slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.slot[0].readOnly.prop).toBe(true);
    expect(newRoot.props.object.slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.object.slot[0].readOnly.prop).toBe(true);
    expect(didChange).toBe(true);
  });

  it("should not re-run when node doesn't change", async () => {
    await resolveComponentData(
      toComponent(appStore.getState().state.data.root),
      appStore.getState().config
    );

    const { node: newRoot, didChange } = await resolveComponentData(
      toComponent(appStore.getState().state.data.root),
      appStore.getState().config
    );

    expect(rootResolveData).toHaveBeenCalledTimes(1);
    expect(componentResolveData).toHaveBeenCalledTimes(3);
    expect(newRoot.props?.title).toBe("Resolved title");
    expect(newRoot.readOnly?.title).toBe(true);
    expect(newRoot.props.slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.slot[0].readOnly.prop).toBe(true);
    expect(didChange).toBe(false);
  });

  it("should re-run if forced to", async () => {
    // When: ---------------
    await resolveComponentData(
      toComponent(appStore.getState().state.data.root),
      appStore.getState().config
    );

    const { node: newRoot, didChange } = await resolveComponentData(
      toComponent(appStore.getState().state.data.root),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "force"
    );

    // Then: ---------------
    expect(rootResolveData).toHaveBeenCalledTimes(2);
    expect(componentResolveData).toHaveBeenCalledTimes(6);
    expect(newRoot.props?.title).toBe("Resolved title");
    expect(newRoot.readOnly?.title).toBe(true);
    expect(newRoot.props.slot[0].props.prop).toBe("Hello, world");
    expect(newRoot.props.slot[0].readOnly.prop).toBe(true);
    expect(didChange).toBe(true);
  });

  it("should re-run when parent changes for 'move' triggers", async () => {
    // When: ---------------
    const initialResolution = await resolveComponentData(
      toComponent({
        type: "MyComponentWithResolver",
        props: { id: "moved" },
      }),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "load",
      {
        type: "MyComponentWithoutResolver",
        props: {
          id: "parent-1",
          slot: [
            {
              type: "MyComponentWithResolver",
              props: { id: "moved" },
            },
            {
              type: "MyComponentWithResolver",
              props: { id: "not-moved-2" },
            },
          ],
        },
      }
    );

    const movedResolution = await resolveComponentData(
      toComponent({
        type: "MyComponentWithResolver",
        props: { id: "moved" },
      }),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "move",
      {
        type: "MyComponentWithoutResolver",
        props: {
          id: "parent-2",
          slot: [
            {
              type: "MyComponentWithResolver",
              props: { id: "moved" },
            },
          ],
        },
      }
    );

    // Then: ---------------
    expect(componentResolveData).toHaveBeenCalledTimes(2);
    expect(componentResolveData.mock.calls[0][1].parent).toStrictEqual({
      type: "MyComponentWithoutResolver",
      props: {
        id: "parent-1",
        slot: [
          {
            type: "MyComponentWithResolver",
            props: { id: "moved" },
          },
          {
            type: "MyComponentWithResolver",
            props: { id: "not-moved-2" },
          },
        ],
      },
    });
    expect(componentResolveData.mock.calls[1][1].parent).toStrictEqual({
      type: "MyComponentWithoutResolver",
      props: {
        id: "parent-2",
        slot: [
          {
            type: "MyComponentWithResolver",
            props: { id: "moved" },
          },
        ],
      },
    });
    expect(initialResolution.node.props.prop).toBe("Hello, world");
    expect(initialResolution.node.readOnly.prop).toBe(true);
    expect(initialResolution.didChange).toBe(true);
    expect(movedResolution.node.props.prop).toBe("Hello, world");
    expect(movedResolution.node.readOnly.prop).toBe(true);
    expect(movedResolution.didChange).toBe(true);
  });

  it("shouldn't re-run when parent doesn't change for 'move' triggers", async () => {
    // When: ---------------
    const parent = {
      type: "MyComponentWithoutResolver",
      props: {
        id: "parent-1",
        slot: [
          {
            type: "MyComponentWithResolver",
            props: { id: "moved" },
          },
        ],
      },
    };

    const initialResolution = await resolveComponentData(
      toComponent({
        type: "MyComponentWithResolver",
        props: { id: "moved" },
      }),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "load",
      parent
    );

    const movedResolution = await resolveComponentData(
      toComponent({
        type: "MyComponentWithResolver",
        props: { id: "moved" },
      }),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "move",
      parent
    );

    // Then: ---------------
    expect(componentResolveData).toHaveBeenCalledTimes(1);
    expect(componentResolveData.mock.calls[0][1].parent).toStrictEqual({
      type: "MyComponentWithoutResolver",
      props: {
        id: "parent-1",
        slot: [
          {
            type: "MyComponentWithResolver",
            props: { id: "moved" },
          },
        ],
      },
    });
    expect(initialResolution.node.props.prop).toBe("Hello, world");
    expect(initialResolution.node.readOnly.prop).toBe(true);
    expect(initialResolution.didChange).toBe(true);
    expect(movedResolution.node.props.prop).toBe("Hello, world");
    expect(movedResolution.node.readOnly.prop).toBe(true);
    expect(movedResolution.didChange).toBe(false);
  });

  it("shouldn't run for 'move' triggers before the component resolves once for other actions", async () => {
    // When: ---------------
    const movedResolution = await resolveComponentData(
      toComponent({
        type: "MyComponentWithResolver",
        props: { id: "inserted" },
      }),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "move",
      {
        type: "MyComponentWithoutResolver",
        props: {
          id: "parent-1",
          slot: [
            {
              type: "MyComponentWithResolver",
              props: { id: "inserted" },
            },
          ],
        },
      }
    );

    const insertedResolution = await resolveComponentData(
      toComponent({
        type: "MyComponentWithResolver",
        props: { id: "inserted" },
      }),
      appStore.getState().config,
      undefined,
      undefined,
      undefined,
      "insert",
      {
        type: "MyComponentWithoutResolver",
        props: {
          id: "parent-1",
          slot: [
            {
              type: "MyComponentWithResolver",
              props: { id: "inserted" },
            },
          ],
        },
      }
    );

    // Then: ---------------
    expect(componentResolveData).toHaveBeenCalledTimes(1);
    expect(componentResolveData.mock.calls[0][1].parent).toStrictEqual({
      type: "MyComponentWithoutResolver",
      props: {
        id: "parent-1",
        slot: [
          {
            type: "MyComponentWithResolver",
            props: { id: "inserted" },
          },
        ],
      },
    });
    expect(insertedResolution.node.props.prop).toBe("Hello, world");
    expect(insertedResolution.node.readOnly.prop).toBe(true);
    expect(insertedResolution.didChange).toBe(true);
    expect(movedResolution.node).toStrictEqual({});
    expect(movedResolution.didChange).toBe(false);
  });
});
