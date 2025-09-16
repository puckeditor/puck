import { renderHook, act, waitFor } from "@testing-library/react";
import { useRegisterFieldsSlice } from "../fields";
import { createAppStore, defaultAppState } from "../..";
import { Config, ComponentData } from "../../../types";
import { PrivateAppState } from "../../../types/Internal";
import { walkAppState } from "../../../lib/data/walk-app-state";
import { makeStatePublic } from "../../../lib/data/make-state-public";

const baseState: PrivateAppState = {
  ...defaultAppState,
  data: {
    content: [
      {
        type: "Heading",
        props: { id: "heading-1", title: "Hello" },
      },
    ],
    root: {},
    zones: {},
  },
};

const appStore = createAppStore();

function resetStores() {
  // Reset main app store:
  appStore.setState(
    {
      ...appStore.getInitialState(),
      state: walkAppState(baseState, appStore.getInitialState().config),
    },
    true
  );
}

const selectFirst = (config: Config) => {
  appStore.setState({
    ...appStore.getState(),
    config,
    selectedItem: appStore.getState().state.data.content[0],
    state: walkAppState(
      {
        ...appStore.getState().state,
        ui: {
          ...appStore.getState().state.ui,
          itemSelector: {
            index: 0,
          },
        },
      },
      config
    ),
  });
};

describe("fields slice", () => {
  beforeEach(() => {
    resetStores();
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

    selectFirst(config);

    renderHook(() => useRegisterFieldsSlice(appStore, "heading-1"));

    const { fields, loading } = appStore.getState().fields;

    expect(fields).toEqual({ title: { type: "text" } });
    expect(loading).toBe(false);
  });

  it("calls the root resolveFields if defined", async () => {
    const mockResolveFields = jest.fn().mockResolvedValue({
      title: { type: "textarea" },
    });

    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
        },
      },
      root: {
        resolveFields: mockResolveFields,
      },
    };

    appStore.setState({
      config,
    });

    renderHook(() => useRegisterFieldsSlice(appStore));
    expect(mockResolveFields).toHaveBeenCalledTimes(1);
    expect(mockResolveFields).toHaveBeenCalledWith(
      {
        props: { id: "root" },
        type: "root",
      },
      {
        appState: makeStatePublic(appStore.getState().state),
        changed: {
          id: true,
        },
        fields: { title: { type: "text" } },
        metadata: {},
        lastData: {},
        lastFields: { title: { type: "text" } },
        parent: null,
      }
    );

    await waitFor(() => {
      const { fields, loading } = appStore.getState().fields;
      expect(fields).toEqual({ title: { type: "textarea" } });
      expect(loading).toBe(false);
    });
  });

  it("calls a component's resolveFields if defined", async () => {
    const mockResolveFields = jest.fn().mockResolvedValue({
      title: { type: "textarea" },
    });

    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
          resolveFields: mockResolveFields,
        },
      },
    };

    selectFirst(config);

    renderHook(() => useRegisterFieldsSlice(appStore, "heading-1"));

    expect(mockResolveFields).toHaveBeenCalledTimes(1);
    expect(mockResolveFields).toHaveBeenCalledWith(
      {
        props: { id: "heading-1", title: "Hello" },
        type: "Heading",
      },
      {
        appState: makeStatePublic(appStore.getState().state),
        changed: {
          id: true,
          title: true,
        },
        fields: { title: { type: "text" } },
        metadata: {},
        lastData: null,
        lastFields: { title: { type: "text" } },
        parent: { props: { id: "root" }, type: "root" },
      }
    );

    // We set a short timeout in the store (50 ms) before loading = true,
    // so let's wait for that plus the async resolution:
    await waitFor(() => {
      const { fields, loading } = appStore.getState().fields;
      // Once resolved, we expect the store to hold the new fields:
      expect(fields).toEqual({ title: { type: "textarea" } });
      expect(loading).toBe(false);
    });
  });

  it("calls a component's resolveFields with correct fields on subsequent calls", async () => {
    const mockResolveFields = jest.fn().mockResolvedValue({
      title: { type: "textarea" },
    });

    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
          resolveFields: mockResolveFields,
        },
      },
    };

    selectFirst(config);

    renderHook(() => useRegisterFieldsSlice(appStore, "heading-1"));

    expect(mockResolveFields).toHaveBeenCalledTimes(1);

    // We set a short timeout in the store (50 ms) before loading = true,
    // so let's wait for that plus the async resolution:
    await waitFor(() => {
      const { fields } = appStore.getState().fields;
      expect(fields).toEqual({ title: { type: "textarea" } });
    });

    mockResolveFields.mockReset();

    appStore.getState().dispatch({
      type: "replace",
      data: {
        ...appStore.getState().selectedItem!,
        props: {
          ...appStore.getState().selectedItem!.props,
          title: "Hello, world",
        },
      },
      destinationIndex: 0,
      destinationZone: "root:default-zone",
    });

    expect(mockResolveFields).toHaveBeenCalledTimes(1);
    expect(mockResolveFields).toHaveBeenCalledWith(
      {
        props: { id: "heading-1", title: "Hello, world" },
        type: "Heading",
      },
      {
        appState: makeStatePublic(appStore.getState().state),
        changed: {
          id: false,
          title: true,
        },
        fields: { title: { type: "text" } },
        metadata: {},
        lastData: {
          props: { id: "heading-1", title: "Hello" },
          type: "Heading",
        },
        lastFields: { title: { type: "textarea" } },
        parent: { props: { id: "root" }, type: "root" },
      }
    );
  });

  it("calls a component's resolveFields with correct fields on subsequent calls, if item changes", async () => {
    const mockResolveFields = jest.fn().mockResolvedValue({
      title: { type: "textarea" },
    });

    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
          resolveFields: mockResolveFields,
        },
        Block: {
          fields: { title: { type: "number" } },
          render: () => <div />,
          resolveFields: mockResolveFields,
        },
      },
    };

    selectFirst(config);

    const { rerender } = renderHook(
      ({ id }: { id: string }) => useRegisterFieldsSlice(appStore, id),
      { initialProps: { id: "heading-1" } }
    );

    // We set a short timeout in the store (50 ms) before loading = true,
    // so let's wait for that plus the async resolution:
    await waitFor(() => {
      const { fields } = appStore.getState().fields;
      expect(fields).toEqual({ title: { type: "textarea" } });
    });

    expect(mockResolveFields).toHaveBeenCalledTimes(1);

    // Change data and check result
    act(() => {
      const newItem: ComponentData = {
        props: { id: "block-1", title: "1" },
        type: "Block",
      };

      appStore.setState({
        state: walkAppState(
          {
            ...appStore.getState().state,
            data: {
              ...appStore.getState().state.data,
              content: [...appStore.getState().state.data.content, newItem],
            },
          },
          config
        ),
        selectedItem: newItem,
      });
    });

    mockResolveFields.mockReset();

    rerender({ id: "block-1" });

    expect(mockResolveFields).toHaveBeenCalledTimes(1);
    expect(mockResolveFields).toHaveBeenCalledWith(
      {
        props: { id: "block-1", title: "1" },
        type: "Block",
      },
      {
        appState: makeStatePublic(appStore.getState().state),
        changed: {
          id: true,
          title: true,
        },
        fields: { title: { type: "number" } },
        metadata: {},
        lastData: null,
        lastFields: { title: { type: "number" } },
        parent: { props: { id: "root" }, type: "root" },
      }
    );
  });

  it("sets loading = true if resolver is slow (deferred loading)", async () => {
    // Make a resolver that waits
    const mockResolveFields = jest
      .fn()
      .mockImplementation(async (data, { fields }) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ...fields,
              body: { type: "textarea" },
            });
          }, 100);
        });
      });

    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
          resolveFields: mockResolveFields,
        },
      },
    };

    selectFirst(config);

    renderHook(() => useRegisterFieldsSlice(appStore, "heading-1"));

    // After 50ms, loading should become true:
    await waitFor(() => {
      expect(appStore.getState().fields.loading).toBe(true);
    });

    // After 100ms total, the resolver finishes:
    await waitFor(() => {
      const { fields, loading } = appStore.getState().fields;
      expect(fields).toEqual({
        title: { type: "text" },
        body: { type: "textarea" },
      });
      expect(loading).toBe(false);
      expect(mockResolveFields).toHaveBeenCalledTimes(1);
    });
  });

  it("updates fields again if node data changes", async () => {
    const mockResolveFields = jest.fn().mockResolvedValue({
      title: { type: "text" },
    });

    const config: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: () => <div />,
          resolveFields: mockResolveFields,
        },
      },
    };

    selectFirst(config);

    renderHook(() => useRegisterFieldsSlice(appStore, "heading-1"));

    // First call
    expect(mockResolveFields).toHaveBeenCalledTimes(1);

    // Now let's simulate a data change
    const selectedItem = appStore.getState().selectedItem;
    const updatedItem = {
      ...selectedItem!,
      props: { ...selectedItem?.props, title: "Newly changed" },
    };

    act(() => {
      appStore.getState().dispatch({
        type: "replace",
        data: updatedItem,
        destinationIndex: 0,
        destinationZone: "root:default-zone",
      });
    });

    // The subscription should trigger a second resolve:
    await waitFor(() => {
      expect(mockResolveFields).toHaveBeenCalledTimes(2);
    });
  });
});
