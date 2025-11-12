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
});
