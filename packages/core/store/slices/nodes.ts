import { AppStore } from "../";

type NodeMethods = {
  sync: () => void;
  hideOverlay: () => void;
  showOverlay: () => void;
};

type PuckNodeInstance = {
  id: string;
  methods: NodeMethods;
  element: HTMLElement | null;
};

export type NodesSlice = {
  nodes: Record<string, PuckNodeInstance | undefined>;
  registerNode: (id: string, node: Partial<PuckNodeInstance>) => void;
  unregisterNode: (id: string, node?: Partial<PuckNodeInstance>) => void;
};

export const createNodesSlice = (
  set: (newState: Partial<AppStore>) => void,
  get: () => AppStore
): NodesSlice => ({
  nodes: {},
  registerNode: (id: string, node: Partial<PuckNodeInstance>) => {
    const s = get().nodes;

    const emptyNode: PuckNodeInstance = {
      id,
      methods: {
        sync: () => null,
        hideOverlay: () => null,
        showOverlay: () => null,
      },
      element: null,
    };

    const existingNode: PuckNodeInstance | undefined = s.nodes[id];

    set({
      nodes: {
        ...s,
        nodes: {
          ...s.nodes,
          [id]: {
            ...emptyNode,
            ...existingNode,
            ...node,
            id,
          },
        },
      },
    });
  },
  unregisterNode: (id) => {
    const s = get().nodes;
    const existingNode: PuckNodeInstance | undefined = s.nodes[id];

    if (existingNode) {
      const newNodes = { ...s.nodes };

      delete newNodes[id];

      set({
        nodes: {
          ...s,
          nodes: newNodes,
        },
      });
    }
  },
});
