import { act } from "@testing-library/react";
import { createAppStore } from "../../";

const appStore = createAppStore();

function resetStores() {
  // Reset the main app store
  appStore.setState(
    {
      ...appStore.getInitialState(),
    },
    true
  );
}

describe("nodes slice", () => {
  beforeEach(() => {
    resetStores();
  });

  it("registerNode stores the node data, merging on subsequent calls", () => {
    expect(Object.keys(appStore.getState().nodes.nodes)).toHaveLength(0);

    const syncMethod = jest.fn();

    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        methods: {
          sync: syncMethod,
          hideOverlay: () => {},
          showOverlay: () => {},
        },
      });
    });

    const initialNode = appStore.getState().nodes.nodes["test-1"];
    expect(initialNode).toBeDefined();

    // Re-register with partial changes
    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        element: "stub" as any,
      });
    });

    const updatedNode = appStore.getState().nodes.nodes["test-1"];
    expect(updatedNode).toBeDefined();
    expect(updatedNode?.methods.sync).toBe(syncMethod);
    expect(updatedNode?.element).toBe("stub");
  });

  it("unregisterNode removes from the store", () => {
    act(() => {
      appStore.getState().nodes.registerNode("test-2", {});
    });
    expect(appStore.getState().nodes.nodes["test-2"]).toBeDefined();

    act(() => {
      appStore.getState().nodes.unregisterNode("test-2");
    });
    expect(appStore.getState().nodes.nodes["test-2"]).toBeUndefined();
  });
});
