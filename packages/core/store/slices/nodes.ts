import { AppStore } from "../";

export type NodeHandle = {
  sync: () => void;
  hideOverlay: () => void;
  showOverlay: () => void;
};

export type NodesSlice = {
  registerNode: (id: string, handle: NodeHandle) => void;
  unregisterNode: (id: string) => void;
  syncNode: (id?: string | null) => void;
  syncNodes: (ids: Array<string | null | undefined>) => void;
  setOverlayVisible: (id: string | null | undefined, visible: boolean) => void;
};

export const createNodesSlice = (
  _set: (newState: Partial<AppStore>) => void,
  _get: () => AppStore
): NodesSlice => {
  const registry = new Map<string, NodeHandle>();

  return {
    registerNode: (id, handle) => {
      registry.set(id, handle);
    },
    unregisterNode: (id) => {
      registry.delete(id);
    },
    syncNode: (id) => {
      if (!id) return;

      registry.get(id)?.sync();
    },
    syncNodes: (ids) => {
      ids.forEach((id) => {
        if (!id) return;

        registry.get(id)?.sync();
      });
    },
    setOverlayVisible: (id, visible) => {
      if (!id) return;

      const node = registry.get(id);

      if (!node) return;

      if (visible) {
        node.showOverlay();
        return;
      }

      node.hideOverlay();
    },
  };
};
