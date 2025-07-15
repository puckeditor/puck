import { resolveFields, cache } from "../resolve-fields";
import { Config, Fields } from "../../types";
import { defaultAppState } from "../../store";
import { walkAppState } from "../data/walk-app-state";

const myComponentFields: Fields = {
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

const rootResolverMock = jest.fn((...args) => null);
const componentResolverMock = jest.fn((...args) => null);

const config: Config = {
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
    resolveFields: (...args) => {
      rootResolverMock(...args);

      return {
        resolved: { type: "text" },
      };
    },
  },
  components: {
    MyComponentWithResolver: {
      fields: myComponentFields,
      resolveFields: (...args) => {
        componentResolverMock(...args);

        return {
          resolved: { type: "text" },
        };
      },
      render: () => <div />,
    },
    MyComponentWithoutResolver: {
      fields: myComponentFields,
      render: () => <div />,
    },
  },
};

describe("resolveFields", () => {
  afterEach(() => {
    rootResolverMock.mockClear();
    componentResolverMock.mockClear();
    cache.lastChange = {};
  });

  it("returns default fields if no resolver is defined", async () => {
    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
        },
      },
    };

    const fields = await resolveFields(
      { type: "Heading", props: { id: "Heading-1" } },
      config,
      defaultAppState
    );

    expect(fields).toEqual({
      data: { title: { type: "text" } },
      didChange: true,
    });
  });

  it("should run resolvers for every node in the tree", async () => {
    const onResolveStart = jest.fn(() => null);
    const onResolveEnd = jest.fn(() => null);

    const componentItem = {
      type: "MyComponentWithResolver",
      props: { id: "slotted" },
    };

    const rootItem = {
      type: "root",
      props: {
        id: "root",
        slot: [componentItem],
      },
    };
    await resolveFields(
      rootItem,
      config,
      defaultAppState,
      {},
      onResolveStart,
      onResolveEnd
    );

    expect(rootResolverMock).toHaveBeenCalled();
    expect(componentResolverMock).toHaveBeenCalled();

    expect(onResolveStart).toHaveBeenCalledWith(rootItem);
    expect(onResolveStart).toHaveBeenCalledWith(componentItem);

    expect(onResolveEnd).toHaveBeenCalledWith(rootItem, {
      data: {
        resolved: { type: "text" },
      },
      didChange: true,
    });
    expect(onResolveEnd).toHaveBeenCalledWith(componentItem, {
      data: {
        resolved: { type: "text" },
      },
      didChange: true,
    });
  });

  it("should run child resolvers even if parent doesn't have one", async () => {
    const onResolveStart = jest.fn(() => null);
    const onResolveEnd = jest.fn(() => null);

    const componentItem = {
      type: "MyComponentWithResolver",
      props: { id: "slotted" },
    };

    const rootItem = {
      type: "root",
      props: {
        id: "root",
        slot: [componentItem],
      },
    };

    const newConfig = {
      ...config,
      root: { ...config.root, resolveFields: undefined },
    };

    await resolveFields(
      rootItem,
      newConfig,
      defaultAppState,
      {},
      onResolveStart,
      onResolveEnd
    );

    expect(rootResolverMock).not.toHaveBeenCalled();
    expect(componentResolverMock).toHaveBeenCalled();
  });

  it("should not re-run when node doesn't change", async () => {
    const onResolveStart = jest.fn(() => null);
    const onResolveEnd = jest.fn(() => null);

    const rootItem = {
      type: "root",
      props: {
        id: "root",
        slot: [],
      },
    };

    await resolveFields(
      rootItem,
      config,
      defaultAppState,
      {},
      onResolveStart,
      onResolveEnd
    );

    expect(rootResolverMock).toHaveBeenCalledTimes(1);
  });

  it("should provide the parent node", async () => {
    const componentItem = {
      type: "MyComponentWithResolver",
      props: { id: "slotted" },
    };

    const root = {
      type: "root",
      props: {
        id: "root",
        slot: [componentItem],
      },
    };

    await resolveFields(
      root,
      config,
      walkAppState(
        { ...defaultAppState, data: { ...defaultAppState.data, root } },
        config
      ),
      {}
    );

    const { lastCall } = componentResolverMock.mock;

    const returned = lastCall ? lastCall[1] : null;

    expect(returned.parent).toMatchInlineSnapshot(`
      {
        "props": {
          "id": "root",
          "slot": [
            {
              "props": {
                "id": "slotted",
              },
              "type": "MyComponentWithResolver",
            },
          ],
        },
        "type": "root",
      }
    `);
  });
});
