import { act, renderHook, waitFor } from "@testing-library/react";
import { createAppStore, defaultAppState } from "../../store";
import { Config } from "../../types";
import { useResolveDataOnMoved } from "../use-resolve-data-on-moved";
import { ItemSelector } from "../data/get-item";
import { rootDroppableId } from "../root-droppable-id";
import { cache } from "../resolve-component-data";
import { walkAppState } from "../data/walk-app-state";
import { insertComponent } from "../insert-component";

const appStore = createAppStore();

function resetStores() {
  appStore.setState(
    {
      ...appStore.getInitialState(),
    },
    true
  );
}

const childResolveData = jest.fn(async (data, params) => {
  if (params.trigger === "moved") {
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

const insertedResolveData = jest.fn(async (data, params) => {
  if (params.trigger === "moved") {
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
    InsertedChild: {
      fields: {},
      resolveData: insertedResolveData,
      render: () => <div />,
    },
  },
};

const moveChildTo = (
  targetItemSelector: ItemSelector,
  drag = true,
  sourceItemSelector: ItemSelector = { zone: "Parent-1:items", index: 0 }
) => {
  const dispatch = appStore.getState().dispatch;

  if (drag) {
    dispatch({
      type: "setUi",
      ui: {
        isDragging: true,
      },
    });
  }

  dispatch({
    type: "move",
    sourceIndex: sourceItemSelector.index,
    sourceZone: sourceItemSelector.zone || rootDroppableId,
    destinationZone: targetItemSelector.zone || rootDroppableId,
    destinationIndex: targetItemSelector.index,
  });

  if (drag) {
    dispatch({
      type: "setUi",
      ui: {
        isDragging: false,
        itemSelector: targetItemSelector,
      },
    });
  }
};

// TODO: Change this when we solve race conditions over caches, it should be 1
const resolveAndCommitDataCalls = 2;

describe("useResolveDataOnMoved", () => {
  beforeEach(async () => {
    resetStores();
    jest.clearAllMocks();
    cache.lastChange = {};
    appStore.setState({
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
    });

    await act(async () => {
      // This executes resolveData twice because of race conditions in cache
      appStore.getState().resolveAndCommitData();
    });
  });

  it("resolves when dropped in a different parent", async () => {
    // When: ---------------
    renderHook(() => useResolveDataOnMoved(appStore));

    await act(async () => moveChildTo({ zone: "Parent-2:items", index: 0 }));

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

  it("doesn't resolve when when moving with the dispatcher (no drag and drop)", async () => {
    // When: ---------------
    renderHook(() => useResolveDataOnMoved(appStore));

    await act(async () =>
      moveChildTo({ zone: "Parent-2:items", index: 0 }, false)
    );

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(resolveAndCommitDataCalls);
    const mockedReturn = await childResolveData.mock.results[
      resolveAndCommitDataCalls - 1
    ].value;
    expect(mockedReturn.props.resolvedProp).toBe("Resolved");
  });

  it("doesn't resolve when dropped in the same parent", async () => {
    // When: ---------------
    renderHook(() => useResolveDataOnMoved(appStore));

    await act(async () => moveChildTo({ zone: "Parent-1:items", index: 1 }));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(resolveAndCommitDataCalls);
    const mockedReturn = await childResolveData.mock.results[
      resolveAndCommitDataCalls - 1
    ].value;
    expect(mockedReturn.props.resolvedProp).toBe("Resolved");
  });

  it("doesn't resolve when inserting", async () => {
    // When: --------------
    renderHook(() => useResolveDataOnMoved(appStore));

    await act(() =>
      insertComponent("InsertedChild", "Parent-1:items", 0, appStore.getState())
    );

    // Then: ---------------
    expect(insertedResolveData).toHaveBeenCalledTimes(1);
    const mockedReturn = await insertedResolveData.mock.results[0].value;
    expect(mockedReturn.props.resolvedProp).toBe("Resolved");

    expect(childResolveData).toHaveBeenCalledTimes(resolveAndCommitDataCalls);
  });

  it("resolves with the moved trigger", async () => {
    // When: ---------------
    renderHook(() => useResolveDataOnMoved(appStore));

    await act(async () =>
      moveChildTo({ zone: "Parent-2:items", index: 0 }, true)
    );

    // Then: ---------------
    const expectedCalls = resolveAndCommitDataCalls + 1;
    expect(childResolveData).toHaveBeenCalledTimes(expectedCalls);
    expect(childResolveData.mock.calls[expectedCalls - 1][1].trigger).toBe(
      "moved"
    );
    const mockedReturn = await childResolveData.mock.results[expectedCalls - 1]
      .value;
    expect(mockedReturn.props.resolvedProp).toBe("Resolved moved");
  });
});
