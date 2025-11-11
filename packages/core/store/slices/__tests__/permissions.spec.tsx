import { renderHook, act, waitFor } from "@testing-library/react";
import { useRegisterPermissionsSlice } from "../permissions";
import { defaultAppState, createAppStore } from "../../";
import { rootDroppableId } from "../../../lib/root-droppable-id";
import { walkAppState } from "../../../lib/data/walk-app-state";
import { makeStatePublic } from "../../../lib/data/make-state-public";
import { Config } from "../../../types";

const appStore = createAppStore();

function resetStores() {
  appStore.setState(
    {
      ...appStore.getInitialState(),
    },
    true
  );
}

describe("permissions slice", () => {
  beforeEach(() => {
    resetStores();
  });

  it("resolves on load", async () => {
    const mockResolvePermissions = jest.fn().mockReturnValue({});

    appStore.setState({
      config: {
        root: {
          render: () => <div />,
          resolvePermissions: mockResolvePermissions,
        },
        components: {},
      },
      state: {
        ...defaultAppState,
        data: {
          content: [],
          root: { props: { title: "Hello, world" } },
          zones: {},
        },
      },
    });

    renderHook(() => useRegisterPermissionsSlice(appStore, { foo: true }));

    expect(mockResolvePermissions).toHaveBeenCalledTimes(1);
  });

  it("auto-resolves when appStore data changes", async () => {
    const mockResolvePermissions = jest.fn().mockReturnValue({});

    appStore.setState({
      config: {
        root: {
          render: () => <div />,
          resolvePermissions: mockResolvePermissions,
        },
        components: {},
      },
      state: {
        ...defaultAppState,
        data: {
          content: [],
          root: { props: { title: "Hello, world" } },
          zones: {},
        },
      },
    });

    renderHook(() => useRegisterPermissionsSlice(appStore, { foo: true }));

    expect(mockResolvePermissions).toHaveBeenCalledTimes(1);

    appStore.setState({
      state: {
        ...defaultAppState,
        data: {
          ...appStore.getState().state.data,
          root: {
            props: {
              title: "Goodbye, world",
            },
          },
        },
      },
    });

    expect(mockResolvePermissions).toHaveBeenCalledTimes(2);
  });

  it("sets loading state if a resolver is defined, and doesn't if none is defined", async () => {
    let loadingCalled = false;
    let unloadingCalled = false;

    // Mock to see if they are called
    appStore.setState({
      setComponentLoading: () => {
        loadingCalled = true;
        return () => {
          unloadingCalled = true;
        };
      },
    });

    renderHook(() =>
      useRegisterPermissionsSlice(appStore, { globalTest: true })
    );

    await act(async () => {
      appStore.getState().permissions.resolvePermissions();
    });

    expect(loadingCalled).toBe(false);
    expect(unloadingCalled).toBe(false);

    resetStores();
    loadingCalled = false;
    unloadingCalled = false;

    appStore.setState({
      config: {
        components: {
          MyComponent: {
            render: () => <div />,
            resolvePermissions: async () => ({}),
          },
        },
      },
      setComponentLoading: () => {
        loadingCalled = true;
        return () => {
          unloadingCalled = true;
        };
      },

      state: {
        ...defaultAppState,
        data: {
          ...defaultAppState.data,
          content: [{ type: "MyComponent", props: { id: "comp-1" } }],
        },
      },
    });

    renderHook(() =>
      useRegisterPermissionsSlice(appStore, { globalTest: true })
    );

    await act(async () => {
      appStore.getState().permissions.resolvePermissions();
    });

    // Now we expect calls
    expect(loadingCalled).toBe(true);
    expect(unloadingCalled).toBe(true);
  });

  describe("getPermissions()", () => {
    it("returns global permissions by default", () => {
      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { testGlobal: true })
      );

      const perms = appStore.getState().permissions.getPermissions();
      expect(perms.testGlobal).toBe(true);
      expect(perms.drag).toBe(true); // default
    });

    it("returns merged component permissions if present", () => {
      appStore.setState({
        config: {
          components: {
            MyComponent: {
              render: () => <div />,
              permissions: { fromComponent: true },
            },
          },
        },
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { fromGlobal: true })
      );

      const perms = appStore.getState().permissions.getPermissions({
        item: { type: "MyComponent", props: { id: "component-1" } },
      });
      expect(perms.fromGlobal).toBe(true);
      expect(perms.fromComponent).toBe(true);
    });

    it("returns merged root permissions if present", () => {
      appStore.setState({
        config: {
          root: {
            permissions: { rootPerm: true },
          },
          components: {},
        },
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { fromGlobal: true })
      );

      const perms = appStore
        .getState()
        .permissions.getPermissions({ root: true });
      expect(perms.fromGlobal).toBe(true);
      expect(perms.rootPerm).toBe(true);
    });
  });

  describe("resolvePermissions()", () => {
    it("calls component.resolvePermissions if defined", async () => {
      const resolvePermissions = jest.fn().mockReturnValue({
        resolved: true,
      });

      const config = {
        components: {
          MyComponent: {
            render: () => <div />,
            permissions: { base: true },
            resolvePermissions,
          },
        },
      };

      appStore.setState({
        ...appStore.getInitialState(),
        config,
        state: walkAppState(
          {
            ...defaultAppState,
            data: {
              ...defaultAppState.data,
              content: [{ type: "MyComponent", props: { id: "comp-1" } }],
            },
          },
          config
        ),
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { globalTest: true })
      );

      await act(async () => {
        await appStore.getState().permissions.resolvePermissions();
        await appStore.getState().permissions.resolvePermissions(); // Double calls shouldn't run resolvers if data hasn't changed
      });

      expect(resolvePermissions).toHaveBeenCalledTimes(2);
      expect(resolvePermissions).toHaveBeenCalledWith(
        {
          props: { id: "comp-1" },
          type: "MyComponent",
        },
        {
          appState: makeStatePublic(appStore.getState().state),
          changed: { id: true },
          lastData: null,
          lastPermissions: null,
          permissions: {
            base: true,
            delete: true,
            drag: true,
            duplicate: true,
            edit: true,
            globalTest: true,
            insert: true,
          },
          parent: { type: "root", props: { id: "root" } },
        }
      );

      // Confirm that getPermissions merges in resolved perms
      const perms = appStore.getState().permissions.getPermissions({
        item: { type: "MyComponent", props: { id: "comp-1" } },
      });
      expect(perms.resolved).toBe(true);
      expect(perms.globalTest).toBe(true);
    });

    it("provides correct args to component.resolvePermissions on subsequent calls", async () => {
      const resolvePermissions = jest.fn().mockReturnValue({
        resolved: true,
      });

      const config = {
        components: {
          MyComponent: {
            render: () => <div />,
            permissions: { base: true },
            resolvePermissions,
          },
        },
      };

      appStore.setState({
        config,
        state: walkAppState(
          {
            ...defaultAppState,
            data: {
              ...defaultAppState.data,
              content: [{ type: "MyComponent", props: { id: "comp-1" } }],
            },
          },
          config
        ),
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { globalTest: true })
      );

      await act(async () => {
        await appStore.getState().permissions.resolvePermissions();

        const { dispatch } = appStore.getState();

        // Will auto trigger an update
        dispatch({
          type: "replace",
          data: {
            props: { id: "comp-1", title: "changed" },
            type: "MyComponent",
          },
          destinationIndex: 0,
          destinationZone: rootDroppableId,
        });
      });

      expect(resolvePermissions).toHaveBeenCalledTimes(3);
      expect(resolvePermissions).toHaveBeenCalledWith(
        {
          props: { id: "comp-1", title: "changed" },
          type: "MyComponent",
        },
        {
          appState: makeStatePublic(appStore.getState().state),
          changed: { id: false, title: true },
          lastData: {
            props: { id: "comp-1" },
            type: "MyComponent",
          },
          lastPermissions: { resolved: true },
          permissions: {
            base: true,
            delete: true,
            drag: true,
            duplicate: true,
            edit: true,
            globalTest: true,
            insert: true,
          },
          parent: { type: "root", props: { id: "root" } },
        }
      );

      // Confirm that getPermissions merges in resolved perms
      const perms = appStore.getState().permissions.getPermissions({
        item: { type: "MyComponent", props: { id: "comp-1" } },
      });
      expect(perms.resolved).toBe(true);
      expect(perms.globalTest).toBe(true);
    });

    it("updates if item changes or if force = true", async () => {
      let resolveCalls = 0;
      appStore.setState({
        config: {
          components: {
            MyComponent: {
              render: () => <div />,
              resolvePermissions: async (item) => {
                resolveCalls += 1;
                if (item.props.id === "changed-1") {
                  return { changed: true };
                }
                return { notChanged: true };
              },
            },
          },
        },
        state: {
          ...defaultAppState,
          data: {
            ...defaultAppState.data,
            content: [{ type: "MyComponent", props: { id: "comp-1" } }],
          },
        },
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { testGlobal: true })
      );

      // Initial
      await act(async () => {
        await appStore.getState().permissions.resolvePermissions();
      });
      expect(resolveCalls).toBe(2);

      // If nothing changed, calling again won't re-resolve
      await act(async () => {
        await appStore.getState().permissions.resolvePermissions();
      });
      expect(resolveCalls).toBe(2);

      // Force => resolves again
      await act(async () => {
        await appStore.getState().permissions.resolvePermissions({}, true);
      });
      expect(resolveCalls).toBe(3);

      // Change item => triggers new resolution
      appStore.setState({
        state: {
          ...defaultAppState,
          data: {
            content: [{ type: "MyComponent", props: { id: "changed-1" } }],
            root: {},
            zones: {},
          },
        },
      });

      // Watcher will trigger this
      expect(resolveCalls).toBe(4);
    });

    it("should receive the parent component in params", async () => {
      // Given: --------------
      const parentPermissions = { parent: true };
      const outsideParentPermissions = { outsideParent: true };
      const resolvePermissions = jest.fn((_data, params) => {
        if (params.parent.type === "Parent") {
          return parentPermissions;
        }
        return outsideParentPermissions;
      });

      const config: Config = {
        components: {
          Child: {
            resolvePermissions,
            render: () => <div />,
          },
          Parent: {
            fields: {
              items: { type: "slot" },
            },
            render: ({ items: Content }) => <Content />,
          },
        },
      };

      const childComponent = {
        type: "Child",
        props: { id: "child-1" },
      };
      const parentComponent = {
        type: "Parent",
        props: {
          id: "parent-1",
          items: [childComponent],
        },
      };
      const initialData = {
        ...defaultAppState.data,
        content: [parentComponent],
      };

      appStore.setState({
        config,
        state: walkAppState(
          {
            ...defaultAppState,
            data: initialData,
          },
          config
        ),
      });

      // When: --------------
      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { testGlobal: true })
      );

      // Wait for the initial resolvePermissions promises to resolve
      await waitFor(
        () => Object.keys(appStore.getState().permissions.cache).length > 0
      );

      // Then: --------------
      expect(resolvePermissions).toHaveBeenCalledTimes(1);
      expect(resolvePermissions.mock.calls[0][1].parent).toEqual(
        parentComponent
      );
      expect(resolvePermissions.mock.results[0].value).toEqual(
        parentPermissions
      );
    });

    it("updates if parent changes", async () => {
      // Given: --------------
      const parentPermissions = { parent: true };
      const outsideParentPermissions = { outsideParent: true };
      const resolvePermissions = jest.fn((_data, params) => {
        if (params.parent.type === "Parent") {
          return parentPermissions;
        }
        return outsideParentPermissions;
      });

      const config: Config = {
        components: {
          Child: {
            resolvePermissions,
            render: () => <div />,
          },
          Parent: {
            fields: {
              items: { type: "slot" },
            },
            render: ({ items: Content }) => <Content />,
          },
        },
      };

      const childComponent = {
        type: "Child",
        props: { id: "child-1" },
      };
      const parentComponent = {
        type: "Parent",
        props: {
          id: "parent-1",
          items: [childComponent],
        },
      };
      const initialData = {
        ...defaultAppState.data,
        content: [parentComponent],
      };

      appStore.setState({
        config,
        state: walkAppState(
          {
            ...defaultAppState,
            data: initialData,
          },
          config
        ),
      });

      // When: --------------
      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { testGlobal: true })
      );

      // Wait for the initial resolvePermissions promises to resolve
      await waitFor(
        () => Object.keys(appStore.getState().permissions.cache).length > 0
      );

      await act(async () => {
        const { dispatch } = appStore.getState();

        // Move the Child component to root
        dispatch({
          type: "move",
          sourceZone: "parent-1:items",
          sourceIndex: 0,
          destinationZone: rootDroppableId,
          destinationIndex: 0,
        });
      });

      // Then: --------------
      expect(resolvePermissions).toHaveBeenCalledTimes(2);
      expect(resolvePermissions.mock.calls[0][1].parent).toEqual(
        parentComponent
      );
      expect(resolvePermissions.mock.results[0].value).toEqual(
        parentPermissions
      );

      expect(resolvePermissions.mock.calls[1][1].parent).toEqual({
        type: "root",
        props: { id: "root" },
      });
      expect(resolvePermissions.mock.results[1].value).toEqual(
        outsideParentPermissions
      );
    });

    it("doesn't update if moving on the same parent", async () => {
      // Given: --------------
      const parentPermissions = { parent: true };
      const outsideParentPermissions = { outsideParent: true };
      const resolvePermissions = jest.fn((_data, params) => {
        if (params.parent.type === "Parent") {
          return parentPermissions;
        }
        return outsideParentPermissions;
      });

      const config: Config = {
        components: {
          Child: {
            resolvePermissions,
            render: () => <div />,
          },
          Parent: {
            fields: {
              items: { type: "slot" },
            },
            render: ({ items: Content }) => <Content />,
          },
        },
      };

      const childComponent1 = {
        type: "Child",
        props: { id: "child-1" },
      };
      const childComponent2 = {
        type: "Child",
        props: { id: "child-2" },
      };
      const parentComponent = {
        type: "Parent",
        props: {
          id: "parent-1",
          items: [childComponent1, childComponent2],
        },
      };
      const initialData = {
        ...defaultAppState.data,
        content: [parentComponent],
      };

      appStore.setState({
        config,
        state: walkAppState(
          {
            ...defaultAppState,
            data: initialData,
          },
          config
        ),
      });

      // When: --------------
      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { testGlobal: true })
      );

      // Wait for the initial resolvePermissions promises to resolve
      await waitFor(
        () => Object.keys(appStore.getState().permissions.cache).length > 0
      );

      await act(async () => {
        const { dispatch } = appStore.getState();

        // Move the first child component to the second position (same parent)
        dispatch({
          type: "move",
          sourceZone: "parent-1:items",
          sourceIndex: 0,
          destinationZone: "parent-1:items",
          destinationIndex: 1,
        });
      });

      // Then: --------------
      expect(resolvePermissions).toHaveBeenCalledTimes(2);
      // child-1
      expect(resolvePermissions.mock.calls[0][1].parent).toEqual(
        parentComponent
      );
      expect(resolvePermissions.mock.results[0].value).toEqual(
        parentPermissions
      );
      // child-2
      expect(resolvePermissions.mock.calls[1][1].parent).toEqual(
        parentComponent
      );
      expect(resolvePermissions.mock.results[1].value).toEqual(
        parentPermissions
      );
    });
  });

  describe("refreshPermissions()", () => {
    it("force updates if item changes", async () => {
      let resolveCalls = 0;
      appStore.setState({
        config: {
          components: {
            MyComponent: {
              render: () => <div />,
              resolvePermissions: async (item) => {
                resolveCalls += 1;
                if (item.props.id === "changed-1") {
                  return { changed: true };
                }
                return { notChanged: true };
              },
            },
          },
        },
        state: {
          ...defaultAppState,
          data: {
            ...defaultAppState.data,
            content: [{ type: "MyComponent", props: { id: "comp-1" } }],
          },
        },
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { testGlobal: true })
      );

      // Initial
      await act(async () => {
        await appStore.getState().permissions.resolvePermissions();
      });
      expect(resolveCalls).toBe(2);

      await act(async () => {
        await appStore.getState().permissions.refreshPermissions();
      });
      expect(resolveCalls).toBe(3);
    });
  });

  describe("integration with useAppStore subscriptions", () => {
    it("auto-resolves when appStore config changes", async () => {
      let resolveCalled = false;
      appStore.setState({
        config: {
          components: {
            MyComponent: {
              render: () => <div />,
              resolvePermissions: async () => {
                resolveCalled = true;
                return { newPerm: true };
              },
            },
          },
        },
        state: {
          ...defaultAppState,
          data: {
            content: [{ type: "MyComponent", props: { id: "test-1" } }],
            root: {},
            zones: {},
          },
        },
      });

      renderHook(() =>
        useRegisterPermissionsSlice(appStore, { fromGlobal: true })
      );

      // config is already set before hooking, so do a manual "change" to trigger subscription
      await act(async () => {
        appStore.setState({
          config: {
            components: {
              MyComponent: {
                render: () => <div />,
                resolvePermissions: async () => {
                  resolveCalled = true;
                  return { changedPerm: true };
                },
              },
            },
          },
        });
      });

      await waitFor(() => expect(resolveCalled).toBe(true));
    });
  });
});
