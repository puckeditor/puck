import { act } from "@testing-library/react";
import { createAppStore } from "../../";

describe("nodes slice", () => {
  it("registerNode stores handles and syncNode invokes sync", () => {
    const appStore = createAppStore();
    const sync = jest.fn();

    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        sync,
        hideOverlay: jest.fn(),
        showOverlay: jest.fn(),
      });
    });

    act(() => {
      appStore.getState().nodes.syncNode("test-1");
    });

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("setOverlayVisible dispatches show and hide", () => {
    const appStore = createAppStore();
    const hideOverlay = jest.fn();
    const showOverlay = jest.fn();

    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        sync: jest.fn(),
        hideOverlay,
        showOverlay,
      });
    });

    act(() => {
      appStore.getState().nodes.setOverlayVisible("test-1", false);
      appStore.getState().nodes.setOverlayVisible("test-1", true);
    });

    expect(hideOverlay).toHaveBeenCalledTimes(1);
    expect(showOverlay).toHaveBeenCalledTimes(1);
  });

  it("syncNodes preserves order and skips missing ids", () => {
    const appStore = createAppStore();
    const calls: string[] = [];

    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        sync: () => calls.push("test-1"),
        hideOverlay: jest.fn(),
        showOverlay: jest.fn(),
      });
      appStore.getState().nodes.registerNode("test-2", {
        sync: () => calls.push("test-2"),
        hideOverlay: jest.fn(),
        showOverlay: jest.fn(),
      });
    });

    act(() => {
      appStore
        .getState()
        .nodes.syncNodes(["test-2", "missing", undefined, "test-1"]);
    });

    expect(calls).toEqual(["test-2", "test-1"]);
  });

  it("unregisterNode removes handles and later commands become no-ops", () => {
    const appStore = createAppStore();
    const sync = jest.fn();
    const hideOverlay = jest.fn();
    const showOverlay = jest.fn();

    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        sync,
        hideOverlay,
        showOverlay,
      });
      appStore.getState().nodes.unregisterNode("test-1");
    });

    act(() => {
      appStore.getState().nodes.syncNode("test-1");
      appStore.getState().nodes.setOverlayVisible("test-1", false);
      appStore.getState().nodes.setOverlayVisible("test-1", true);
    });

    expect(sync).not.toHaveBeenCalled();
    expect(hideOverlay).not.toHaveBeenCalled();
    expect(showOverlay).not.toHaveBeenCalled();
  });

  it("registry operations do not notify store subscribers", () => {
    const appStore = createAppStore();
    const listener = jest.fn();
    const unsubscribe = appStore.subscribe(listener);

    act(() => {
      appStore.getState().nodes.registerNode("test-1", {
        sync: jest.fn(),
        hideOverlay: jest.fn(),
        showOverlay: jest.fn(),
      });
      appStore.getState().nodes.syncNode("test-1");
      appStore.getState().nodes.setOverlayVisible("test-1", false);
      appStore.getState().nodes.unregisterNode("test-1");
    });

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });
});
