import { act } from "@testing-library/react";
import { createAppStore, defaultAppState } from "../../../store";
import { Config } from "../../../types";
import { cache } from "../../resolve-component-data";
import { resolveDataById } from "../resolve-data-by-id";
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

describe("resolveDataById", () => {
  beforeEach(async () => {
    resetStores();
    jest.clearAllMocks();
    cache.lastChange = {};
  });

  it("resolves when called", async () => {
    // When: ---------------
    await act(() => resolveDataById("Child-1", appStore.getState));

    // Then: ---------------
    expect(childResolveData).toHaveBeenCalledTimes(1);
    const mockedReturn = await childResolveData.mock.results[0].value;
    expect(mockedReturn.props.resolvedProp).toBeDefined();
  });

  it("shows a warning and doesn't resolve if the id doesn't exist", async () => {
    // Given: --------------
    const consoleWarnMock = jest.spyOn(console, "warn").mockImplementation();

    // When: ---------------
    await act(() => resolveDataById("Doesn't exist", appStore.getState));

    // Then: ---------------
    expect(childResolveData).not.toHaveBeenCalled();
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
      resolveDataById("Child-1", appStore.getState);
    });

    // Then: ---------------
    expect(childResolveData).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    consoleWarnMock.mockRestore();
  });
});
