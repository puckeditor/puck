import { act } from "@testing-library/react";
import { createAppStore, defaultAppState } from "../../store";
import { Config } from "../../types";
import { getItem, ItemSelector } from "../data/get-item";
import { walkAppState } from "../data/walk-app-state";
import { cache } from "../resolve-component-data";
import { moveComponent } from "../move-component";

const appStore = createAppStore();

const childResolveData = jest.fn(async (data, params) => {
  if (params.trigger === "move") {
    return {
      ...data,
      props: {
        resolvedProp: "Resolved moved",
      },
    };
  }

  return {
    ...data,
    props: {
      resolvedProp: "Resolved",
    },
  };
});

const config: Config = {
  components: {
    Parent: {
      fields: { items: { type: "slot" } },
      render: () => <div />,
    },
    Child: {
      fields: {},
      resolveData: childResolveData,
      render: () => <div />,
    },
    NonResolvedChild: {
      fields: {},
      render: () => <div />,
    },
  },
};

const moveChildTo = (
  targetItemSelector: ItemSelector,
  sourceItemSelector: ItemSelector = { zone: "Parent-1:items", index: 0 },
  id = "Child-1"
) => {
  moveComponent(id, sourceItemSelector, targetItemSelector, appStore);
};

function resetStores() {
  appStore.setState(
    {
      ...appStore.getInitialState(),
      config,
      state: walkAppState(
        {
          ...defaultAppState,
          data: {
            ...defaultAppState.data,
            content: [
              {
                type: "Parent",
                props: {
                  id: "Parent-1",
                  items: [
                    {
                      type: "Child",
                      props: {
                        id: "Child-1",
                      },
                    },
                    {
                      type: "NonResolvedChild",
                      props: {
                        id: "NonResolvedChild-1",
                      },
                    },
                    {
                      type: "NonResolvedChild",
                      props: {
                        id: "NonResolvedChild-2",
                      },
                    },
                  ],
                },
              },
              {
                type: "Parent",
                props: {
                  id: "Parent-2",
                  items: [],
                },
              },
            ],
          },
        },
        config
      ),
    },
    true
  );
}

// TODO: Change this when we solve race conditions over caches, it should be 1
const resolveAndCommitDataCalls = 2;

describe("moveComponent", () => {
  beforeEach(async () => {
    resetStores();
    jest.clearAllMocks();
    cache.lastChange = {};

    // Initialize resolveData cache
    await act(async () => {
      // This executes resolveData twice because of race conditions in cache
      appStore.getState().resolveAndCommitData();
    });
  });

  it("moves the component", async () => {
    // Given: ---------------
    const targetItemSelector = { zone: "Parent-1:items", index: 1 };

    // When: ---------------
    await act(async () => moveChildTo(targetItemSelector));

    // Then: ---------------
    const componentAtTarget = getItem(
      targetItemSelector,
      appStore.getState().state
    );
    expect(componentAtTarget?.props.id).toEqual("Child-1");
  });

  it("resolves data when dropped in a different parent", async () => {
    // Given: ---------------
    const targetItemSelector = { zone: "Parent-2:items", index: 0 };

    // When: ---------------
    await act(async () => moveChildTo(targetItemSelector));

    // Then: ---------------
    const expectedCalls = resolveAndCommitDataCalls + 1;
    expect(childResolveData).toHaveBeenCalledTimes(expectedCalls);
    expect(
      childResolveData.mock.calls[expectedCalls - 1][1].parent
    ).toStrictEqual({
      type: "Parent",
      props: {
        id: "Parent-2",
        items: [
          {
            type: "Child",
            props: {
              id: "Child-1",
              resolvedProp: "Resolved",
            },
          },
        ],
      },
    });
    const mockedReturn = await childResolveData.mock.results[expectedCalls - 1]
      .value;
    expect(mockedReturn.props.resolvedProp).toBe("Resolved moved");
  });

  it("doesn't resolve data when dropped in the same parent", async () => {
    // Given: ---------------
    const targetItemSelector = { zone: "Parent-1:items", index: 1 };

    // When: ---------------
    await act(async () => moveChildTo(targetItemSelector));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(resolveAndCommitDataCalls);
    const mockedCalls = childResolveData.mock.calls;
    expect(
      mockedCalls.find((call) => call[1].trigger === "move")
    ).toBeUndefined();
  });

  it("resolves data with the move trigger", async () => {
    // When: ---------------
    await act(async () => moveChildTo({ zone: "Parent-2:items", index: 0 }));

    // Then: ---------------
    const expectedCalls = resolveAndCommitDataCalls + 1;
    expect(childResolveData).toHaveBeenCalledTimes(expectedCalls);
    expect(childResolveData.mock.calls[expectedCalls - 1][1].trigger).toBe(
      "move"
    );
    const mockedReturn = await childResolveData.mock.results[expectedCalls - 1]
      .value;
    expect(mockedReturn.props.resolvedProp).toBe("Resolved moved");
  });
});
