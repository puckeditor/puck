import { act, waitFor } from "@testing-library/react";
import { createAppStore, defaultAppState } from "../../../store";
import { Config } from "../../../types";
import { cache } from "../../resolve-component-data";
import { resolveComponentDataById } from "../resolve-component-data-by-id";
import { walkAppState } from "../walk-app-state";

const appStore = createAppStore();

const childResolveData = jest.fn(async (data, params) => {
  if (params.trigger === "force") {
    return {
      ...data,
      props: {
        resolvedProp: "Forced",
      },
    };
  }

  return data;
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
  },
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
                      type: "Child",
                      props: {
                        id: "Child-2",
                      },
                    },
                    {
                      type: "Child",
                      props: {
                        id: "Child-3",
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

describe("useResolveDataOnMoved", () => {
  beforeEach(async () => {
    resetStores();
    jest.clearAllMocks();
    cache.lastChange = {};
  });

  it("resolves when called", async () => {
    // When: ---------------
    await act(() => resolveComponentDataById("Child-1", appStore.getState));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(1);
    const mockedReturn = await childResolveData.mock.results[0].value;
    expect(mockedReturn.props.resolvedProp).toBe("Forced");
  });

  it("resolves even if data hasn't changed", async () => {
    // TODO: Change this when we solve race conditions over caches, it should be 3
    const resolveAndCommitDataCalls = 6;

    // When: ---------------
    await act(async () => {
      // This executes resolveData twice because of race conditions in cache
      appStore.getState().resolveAndCommitData();
    });

    // TODO: Change this when we solve race conditions over caches, we shouldn't need to wait
    await waitFor(() => Object.keys(cache.lastChange).length > 1);

    await act(() => resolveComponentDataById("Child-1", appStore.getState));

    // Then: ---------------
    const expectedCalls = resolveAndCommitDataCalls + 1;
    expect(childResolveData).toHaveBeenCalledTimes(expectedCalls);
    const mockedReturn = await childResolveData.mock.results[expectedCalls - 1]
      .value;
    expect(mockedReturn.props.resolvedProp).toBe("Forced");
  });

  it("shows a warning if the id doesn't exist", async () => {
    // Given: --------------
    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();

    // When: ---------------
    await act(() =>
      resolveComponentDataById("Doesn't exist", appStore.getState)
    );

    // Then: ---------------
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    consoleWarnMock.mockRestore();
  });

  it("shows a warning and doesn't resolve if the component was deleted", async () => {
    // Given: --------------
    const dispatch = appStore.getState().dispatch;
    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();

    // When: ---------------
    await act(async () => {
      dispatch({ type: "remove", index: 0, zone: "Parent-1:items" });
      resolveComponentDataById("Child-1", appStore.getState);
    });

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(0);
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    consoleWarnMock.mockRestore();
  });
});
