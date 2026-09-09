import { act } from "@testing-library/react";
import { createAppStore, defaultAppState } from "../../../store";
import { Config, ResolveDataTrigger } from "../../../types";
import { cache } from "../../resolve-component-data";
import { resolveAndReplaceData } from "../resolve-and-replace-data";
import { walkAppState } from "../walk-app-state";

const appStore = createAppStore();

const childResolveData = jest.fn(async (data, params) => {
  return {
    ...data,
    props: {
      resolvedProp: params.trigger,
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
    StaticChild: {
      fields: { label: { type: "text" } },
      resolveData: async (data) => data, // Return the same data to simulate a no-op resolve
      render: () => <div />,
    },
  },
};

const child1 = {
  type: "Child",
  props: {
    id: "Child-1",
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
                    child1,
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
              {
                type: "StaticChild",
                props: {
                  id: "Static-1",
                  label: "old",
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

describe("resolveAndReplaceData", () => {
  beforeEach(async () => {
    resetStores();
    jest.clearAllMocks();
    cache.lastChange = {};
  });

  it("resolves when called", async () => {
    // When: ---------------
    await act(() => resolveAndReplaceData(child1, appStore.getState));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(1);
    const mockedReturn = await childResolveData.mock.results[0].value;
    expect(mockedReturn.props.resolvedProp).toBeDefined();
  });

  it("resolves with a 'force' trigger by default", async () => {
    // When: ---------------
    await act(() => resolveAndReplaceData(child1, appStore.getState));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(1);
    const mockedReturn = await childResolveData.mock.results[0].value;
    expect(mockedReturn.props.resolvedProp).toBe("force");
  });

  it("resolves for non default triggers", async () => {
    // Given: --------------
    const trigger: ResolveDataTrigger = "insert";

    // When: ---------------
    await act(() => resolveAndReplaceData(child1, appStore.getState, trigger));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(1);
    const mockedReturn = await childResolveData.mock.results[0].value;
    expect(mockedReturn.props.resolvedProp).toBe(trigger);
  });

  it("shows a warning if the id doesn't exist after resolving", async () => {
    // Given: --------------
    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();
    const nonExistentComponent = {
      type: "Child",
      props: {
        id: "Doesn't exist",
      },
    };

    // When: ---------------
    await act(() =>
      resolveAndReplaceData(nonExistentComponent, appStore.getState)
    );

    // Then: ---------------
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    consoleWarnMock.mockRestore();
  });

  describe("writeThrough", () => {
    const editedStaticChild = {
      type: "StaticChild",
      props: { id: "Static-1", label: "new" },
    };

    const getLabel = () =>
      appStore.getState().state.indexes.nodes["Static-1"].data.props.label;

    it("commits the edit when writeThrough is true even though the resolver reports no change", async () => {
      // When: ---------------
      await act(() =>
        resolveAndReplaceData(
          editedStaticChild, // Resolver returns same data, so didChange === false, keeping `old` in store.
          appStore.getState,
          "replace",
          true
        )
      );

      // Then: the edit is written through to the store
      expect(getLabel()).toBe("new");
    });

    it("does not commit the edit when writeThrough is false and the resolver reports no change", async () => {
      // When: ---------------
      await act(() =>
        resolveAndReplaceData(
          editedStaticChild,
          appStore.getState,
          "replace",
          false
        )
      );

      // Then: the no-op resolve is skipped and the store keeps the original data.
      // (This passing also proves didChange was false for the case above.)
      expect(getLabel()).toBe("old");
    });

    it("still commits when the resolver does change the data, regardless of writeThrough", async () => {
      // Given: Child's resolver always rewrites props (didChange === true)
      // When: writeThrough is false
      await act(() =>
        resolveAndReplaceData(child1, appStore.getState, "replace", false)
      );

      // Then: the resolved data is committed
      expect(
        appStore.getState().state.indexes.nodes["Child-1"].data.props
          .resolvedProp
      ).toBe("replace");
    });
  });
});
