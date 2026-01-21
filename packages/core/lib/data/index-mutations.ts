import { ComponentData, Config, Content, Data } from "../../types";
import {
  NodeIndex,
  ZoneIndex,
  PuckNodeData,
  PuckZoneData,
  PrivateAppState,
  ZoneType,
} from "../../types/Internal";
import { flattenNode } from "./flatten-node";
import { rootDroppableId } from "../root-droppable-id";
import { insert } from "./insert";
import { remove } from "./remove";

/**
 * Collect all descendant IDs from a given root node.
 * O(n) where n = number of nodes in index
 */
export function collectDescendantIds(
  nodes: NodeIndex,
  rootId: string
): Set<string> {
  const descendants = new Set<string>();

  for (const [id, nodeData] of Object.entries(nodes)) {
    if (id === rootId) continue;

    // Check if this node's path includes the root
    const pathIds = nodeData.path.map((p) => p.split(":")[0]);
    if (pathIds.includes(rootId)) {
      descendants.add(id);
    }
  }

  return descendants;
}

/**
 * Collect all zone compounds owned by a set of node IDs.
 */
export function collectOwnedZones(
  zones: ZoneIndex,
  nodeIds: Set<string>
): Set<string> {
  const ownedZones = new Set<string>();

  for (const zoneCompound of Object.keys(zones)) {
    const [parentId] = zoneCompound.split(":");
    if (nodeIds.has(parentId)) {
      ownedZones.add(zoneCompound);
    }
  }

  return ownedZones;
}

type IndexNestedSlotsResult = {
  nodes: NodeIndex;
  zones: ZoneIndex;
};

/**
 * Recursively index nested slots within a component.
 * Returns new node and zone entries without mutating inputs.
 */
function indexNestedSlots(
  node: ComponentData,
  config: Config,
  parentPath: string[],
  parentId: string,
  existingNodes: NodeIndex,
  existingZones: ZoneIndex
): IndexNestedSlotsResult {
  const componentConfig = config.components[node.type];
  if (!componentConfig?.fields) {
    return { nodes: existingNodes, zones: existingZones };
  }

  let nodes = { ...existingNodes };
  let zones = { ...existingZones };

  for (const [fieldName, field] of Object.entries(componentConfig.fields)) {
    if (field.type === "slot") {
      const content = (node.props[fieldName] as Content) || [];
      const zoneCompound = `${parentId}:${fieldName}`;
      const zonePath = [...parentPath, zoneCompound];

      // Initialize zone entry
      zones[zoneCompound] = {
        contentIds: content.map((c) => c.props.id),
        type: "slot" as ZoneType,
      };

      // Index each child in the slot
      for (const child of content) {
        const childNode: PuckNodeData = {
          data: child,
          flatData: flattenNode(child, config) as ComponentData,
          parentId,
          zone: fieldName,
          path: zonePath,
        };

        nodes[child.props.id] = childNode;

        // Recurse into nested slots
        const result = indexNestedSlots(
          child,
          config,
          zonePath,
          child.props.id,
          nodes,
          zones
        );
        nodes = result.nodes;
        zones = result.zones;
      }
    }
  }

  return { nodes, zones };
}

/**
 * Update paths for a subtree after a move operation.
 * O(d) where d = number of descendants
 */
function updateSubtreePaths(
  nodes: NodeIndex,
  rootId: string,
  newPath: string[],
  newParentId: string | null,
  newZone: string
): NodeIndex {
  const updatedNodes = { ...nodes };
  const oldNode = nodes[rootId];
  if (!oldNode) return nodes;

  const oldPath = oldNode.path;

  // Update root node
  updatedNodes[rootId] = {
    ...oldNode,
    path: newPath,
    parentId: newParentId,
    zone: newZone,
  };

  // Update all descendants - replace path prefix
  for (const [id, nodeData] of Object.entries(nodes)) {
    if (id === rootId) continue;

    // Check if this node is a descendant
    const nodePathIds = nodeData.path.map((p) => p.split(":")[0]);
    if (nodePathIds.includes(rootId)) {
      // Find where the old path ends and relative path begins
      const oldPathLength = oldPath.length;
      if (nodeData.path.length > oldPathLength) {
        const relativePath = nodeData.path.slice(oldPathLength);
        updatedNodes[id] = {
          ...nodeData,
          path: [...newPath, ...relativePath],
        };
      }
    }
  }

  return updatedNodes;
}

/**
 * Update the nested data structure when inserting into a slot.
 * Returns the updated data with the new item inserted.
 */
function updateDataWithInsert<UserData extends Data>(
  data: UserData,
  state: PrivateAppState<UserData>,
  zoneCompound: string,
  index: number,
  item: ComponentData
): UserData {
  const [parentId, zone] = zoneCompound.split(":");

  // Root content zone
  if (zoneCompound === rootDroppableId) {
    return {
      ...data,
      content: insert(data.content, index, item),
    };
  }

  // Root slot
  if (parentId === "root") {
    return {
      ...data,
      root: {
        ...data.root,
        props: {
          ...data.root.props,
          [zone]: insert((data.root.props?.[zone] as Content) || [], index, item),
        },
      },
    };
  }

  // Legacy DropZone
  if (data.zones?.[zoneCompound]) {
    return {
      ...data,
      zones: {
        ...data.zones,
        [zoneCompound]: insert(data.zones[zoneCompound], index, item),
      },
    };
  }

  // Component slot - need to find and update the parent component
  const updateContentArray = (content: Content): Content => {
    return content.map((c) => {
      if (c.props.id === parentId) {
        return {
          ...c,
          props: {
            ...c.props,
            [zone]: insert((c.props[zone] as Content) || [], index, item),
          },
        };
      }
      // Recursively check slots for nested parents
      const componentConfig = state.indexes.nodes[c.props.id];
      if (componentConfig) {
        const updated = updateComponentSlots(c, parentId, zone, index, item);
        if (updated !== c) return updated;
      }
      return c;
    });
  };

  const updateComponentSlots = (
    component: ComponentData,
    targetParentId: string,
    targetZone: string,
    insertIndex: number,
    insertItem: ComponentData
  ): ComponentData => {
    if (component.props.id === targetParentId) {
      return {
        ...component,
        props: {
          ...component.props,
          [targetZone]: insert(
            (component.props[targetZone] as Content) || [],
            insertIndex,
            insertItem
          ),
        },
      };
    }

    // Check if any slot contains the target
    let updated = false;
    const newProps = { ...component.props };

    for (const [key, value] of Object.entries(component.props)) {
      if (Array.isArray(value) && value.length > 0 && value[0]?.props?.id) {
        const updatedSlot = value.map((child: ComponentData) => {
          const result = updateComponentSlots(
            child,
            targetParentId,
            targetZone,
            insertIndex,
            insertItem
          );
          if (result !== child) updated = true;
          return result;
        });
        if (updated) {
          newProps[key] = updatedSlot;
        }
      }
    }

    return updated ? { ...component, props: newProps } : component;
  };

  return {
    ...data,
    content: updateContentArray(data.content),
  };
}

/**
 * Update the nested data structure when removing from a zone.
 */
function updateDataWithRemove<UserData extends Data>(
  data: UserData,
  state: PrivateAppState<UserData>,
  zoneCompound: string,
  index: number
): UserData {
  const [parentId, zone] = zoneCompound.split(":");

  if (zoneCompound === rootDroppableId) {
    return {
      ...data,
      content: remove(data.content, index),
    };
  }

  if (parentId === "root") {
    return {
      ...data,
      root: {
        ...data.root,
        props: {
          ...data.root.props,
          [zone]: remove((data.root.props?.[zone] as Content) || [], index),
        },
      },
    };
  }

  if (data.zones?.[zoneCompound]) {
    return {
      ...data,
      zones: {
        ...data.zones,
        [zoneCompound]: remove(data.zones[zoneCompound], index),
      },
    };
  }

  // Component slot
  const updateContentArray = (content: Content): Content => {
    return content.map((c) => {
      if (c.props.id === parentId) {
        return {
          ...c,
          props: {
            ...c.props,
            [zone]: remove((c.props[zone] as Content) || [], index),
          },
        };
      }
      // Recursively check slots
      let updated = false;
      const newProps = { ...c.props };

      for (const [key, value] of Object.entries(c.props)) {
        if (Array.isArray(value) && value.length > 0 && value[0]?.props?.id) {
          const updatedSlot = updateContentArray(value as Content);
          if (updatedSlot !== value) {
            newProps[key] = updatedSlot;
            updated = true;
          }
        }
      }

      return updated ? { ...c, props: newProps } : c;
    });
  };

  return {
    ...data,
    content: updateContentArray(data.content),
  };
}

/**
 * Update the nested data structure when replacing a component.
 */
function updateDataWithReplace<UserData extends Data>(
  data: UserData,
  state: PrivateAppState<UserData>,
  zoneCompound: string,
  index: number,
  newItem: ComponentData
): UserData {
  const [parentId, zone] = zoneCompound.split(":");

  if (zoneCompound === rootDroppableId) {
    const newContent = [...data.content];
    newContent[index] = newItem;
    return { ...data, content: newContent };
  }

  if (parentId === "root") {
    const slotContent = [...((data.root.props?.[zone] as Content) || [])];
    slotContent[index] = newItem;
    return {
      ...data,
      root: {
        ...data.root,
        props: {
          ...data.root.props,
          [zone]: slotContent,
        },
      },
    };
  }

  if (data.zones?.[zoneCompound]) {
    const zoneContent = [...data.zones[zoneCompound]];
    zoneContent[index] = newItem;
    return {
      ...data,
      zones: {
        ...data.zones,
        [zoneCompound]: zoneContent,
      },
    };
  }

  // Component slot
  const updateContentArray = (content: Content): Content => {
    return content.map((c) => {
      if (c.props.id === parentId) {
        const slotContent = [...((c.props[zone] as Content) || [])];
        slotContent[index] = newItem;
        return {
          ...c,
          props: {
            ...c.props,
            [zone]: slotContent,
          },
        };
      }
      // Recursively check slots
      let updated = false;
      const newProps = { ...c.props };

      for (const [key, value] of Object.entries(c.props)) {
        if (Array.isArray(value) && value.length > 0 && value[0]?.props?.id) {
          const updatedSlot = updateContentArray(value as Content);
          if (updatedSlot !== value) {
            newProps[key] = updatedSlot;
            updated = true;
          }
        }
      }

      return updated ? { ...c, props: newProps } : c;
    });
  };

  return {
    ...data,
    content: updateContentArray(data.content),
  };
}

/**
 * Insert a node into indexes without walking the full tree.
 * O(1) for the node itself, O(s) for nested slots where s = slot depth.
 */
export function insertNodeToIndex<UserData extends Data>(
  state: PrivateAppState<UserData>,
  config: Config,
  node: ComponentData,
  zoneCompound: string,
  index: number
): PrivateAppState<UserData> {
  const nodeId = node.props.id;
  const [parentId, zone] = zoneCompound.split(":");

  // Get parent path
  const parentNode = state.indexes.nodes[parentId];
  const parentPath = parentNode?.path || [];
  const nodePath = [...parentPath, zoneCompound];

  // Create node entry
  const nodeData: PuckNodeData = {
    data: node,
    flatData: flattenNode(node, config) as ComponentData,
    parentId: parentId === "root" ? null : parentId,
    zone,
    path: nodePath,
  };

  // Get current zone contentIds and insert
  const currentZone = state.indexes.zones[zoneCompound] || {
    contentIds: [],
    type: "slot" as ZoneType,
  };
  const newContentIds = [...currentZone.contentIds];
  newContentIds.splice(index, 0, nodeId);

  // Build new indexes
  let newNodes: NodeIndex = { ...state.indexes.nodes, [nodeId]: nodeData };
  let newZones: ZoneIndex = {
    ...state.indexes.zones,
    [zoneCompound]: {
      ...currentZone,
      contentIds: newContentIds,
    },
  };

  // Recursively index nested slots
  const { nodes: updatedNodes, zones: updatedZones } = indexNestedSlots(
    node,
    config,
    nodePath,
    nodeId,
    newNodes,
    newZones
  );

  // Update data structure
  const newData = updateDataWithInsert(
    state.data,
    state,
    zoneCompound,
    index,
    node
  );

  return {
    ...state,
    data: newData,
    indexes: {
      nodes: updatedNodes,
      zones: updatedZones,
    },
  };
}

/**
 * Remove a node and all descendants from indexes.
 * O(d) where d = number of descendants.
 */
export function removeNodeFromIndex<UserData extends Data>(
  state: PrivateAppState<UserData>,
  nodeId: string,
  zoneCompound: string,
  index: number
): PrivateAppState<UserData> {
  // Collect all descendant IDs
  const nodesToRemove = collectDescendantIds(state.indexes.nodes, nodeId);
  nodesToRemove.add(nodeId);

  // Remove from node index
  const newNodes = { ...state.indexes.nodes };
  for (const id of nodesToRemove) {
    delete newNodes[id];
  }

  // Update zone contentIds for the containing zone
  const currentZone = state.indexes.zones[zoneCompound];
  const newContentIds = currentZone.contentIds.filter((id) => id !== nodeId);

  // Remove zones owned by deleted nodes
  const newZones = { ...state.indexes.zones };
  const zonesToRemove = collectOwnedZones(state.indexes.zones, nodesToRemove);
  for (const zc of zonesToRemove) {
    delete newZones[zc];
  }
  newZones[zoneCompound] = { ...currentZone, contentIds: newContentIds };

  // Update data structure
  const newData = updateDataWithRemove(state.data, state, zoneCompound, index);

  // Also clean up legacy zones in data
  let finalData = newData;
  if (newData.zones) {
    const cleanedZones = { ...newData.zones };
    for (const zc of Object.keys(cleanedZones)) {
      const [zoneParentId] = zc.split(":");
      if (nodesToRemove.has(zoneParentId)) {
        delete cleanedZones[zc];
      }
    }
    finalData = { ...newData, zones: cleanedZones };
  }

  return {
    ...state,
    data: finalData,
    indexes: { nodes: newNodes, zones: newZones },
  };
}

/**
 * Update a node's data without changing structure.
 * O(1) for simple prop changes, O(s) if slots changed.
 */
export function updateNodeInIndex<UserData extends Data>(
  state: PrivateAppState<UserData>,
  config: Config,
  nodeId: string,
  newData: ComponentData,
  zoneCompound: string,
  index: number
): PrivateAppState<UserData> {
  const existingNode = state.indexes.nodes[nodeId];
  if (!existingNode) return state;

  // Update the node entry
  const newNodeData: PuckNodeData = {
    ...existingNode,
    data: newData,
    flatData: flattenNode(newData, config) as ComponentData,
  };

  let newNodes: NodeIndex = {
    ...state.indexes.nodes,
    [nodeId]: newNodeData,
  };

  let newZones = { ...state.indexes.zones };

  // Check if slots changed and re-index if needed
  const componentConfig = config.components[newData.type];
  if (componentConfig?.fields) {
    // First, remove old slot indexes for this node
    const oldOwnedZones = collectOwnedZones(
      state.indexes.zones,
      new Set([nodeId])
    );
    const oldDescendants = collectDescendantIds(state.indexes.nodes, nodeId);

    for (const zc of oldOwnedZones) {
      delete newZones[zc];
    }
    for (const id of oldDescendants) {
      delete newNodes[id];
    }

    // Re-index slots
    const { nodes: updatedNodes, zones: updatedZones } = indexNestedSlots(
      newData,
      config,
      existingNode.path,
      nodeId,
      newNodes,
      newZones
    );
    newNodes = updatedNodes;
    newZones = updatedZones;
  }

  // Update data structure
  const updatedData = updateDataWithReplace(
    state.data,
    state,
    zoneCompound,
    index,
    newData
  );

  return {
    ...state,
    data: updatedData,
    indexes: {
      nodes: newNodes,
      zones: newZones,
    },
  };
}

/**
 * Move a node between zones, updating paths for subtree.
 * O(d) where d = subtree size.
 */
export function moveNodeInIndex<UserData extends Data>(
  state: PrivateAppState<UserData>,
  config: Config,
  nodeId: string,
  sourceZone: string,
  sourceIndex: number,
  destZone: string,
  destIndex: number
): PrivateAppState<UserData> {
  const node = state.indexes.nodes[nodeId];
  if (!node) return state;

  const [destParentId, destZoneName] = destZone.split(":");

  // Calculate new path
  const destParentNode = state.indexes.nodes[destParentId];
  const destParentPath = destParentNode?.path || [];
  const newPath = [...destParentPath, destZone];

  // Update source zone contentIds
  const sourceZoneData = state.indexes.zones[sourceZone];
  const newSourceContentIds = sourceZoneData.contentIds.filter(
    (id) => id !== nodeId
  );

  // Update dest zone contentIds
  const destZoneData = state.indexes.zones[destZone] || {
    contentIds: [],
    type: "slot" as ZoneType,
  };

  // Adjust destination index if moving within same zone
  let adjustedDestIndex = destIndex;
  if (sourceZone === destZone && sourceIndex < destIndex) {
    adjustedDestIndex = destIndex - 1;
  }

  const newDestContentIds = [...destZoneData.contentIds];
  if (sourceZone === destZone) {
    // Remove from source position first
    newDestContentIds.splice(
      newDestContentIds.indexOf(nodeId),
      1
    );
  }
  newDestContentIds.splice(adjustedDestIndex, 0, nodeId);

  // Update node and all descendants' paths
  const updatedNodes = updateSubtreePaths(
    state.indexes.nodes,
    nodeId,
    newPath,
    destParentId === "root" ? null : destParentId,
    destZoneName
  );

  const newZones: ZoneIndex = {
    ...state.indexes.zones,
  };

  if (sourceZone === destZone) {
    newZones[sourceZone] = { ...sourceZoneData, contentIds: newDestContentIds };
  } else {
    newZones[sourceZone] = { ...sourceZoneData, contentIds: newSourceContentIds };
    newZones[destZone] = { ...destZoneData, contentIds: newDestContentIds };
  }

  // Update data structure
  // First remove from source, then insert at dest
  const item = node.data;
  let newData = updateDataWithRemove(
    state.data,
    state,
    sourceZone,
    sourceIndex
  );

  // Create intermediate state for the insert
  const intermediateState: PrivateAppState<UserData> = {
    ...state,
    data: newData,
    indexes: {
      nodes: updatedNodes,
      zones: newZones,
    },
  };

  newData = updateDataWithInsert(
    newData,
    intermediateState,
    destZone,
    adjustedDestIndex,
    item
  );

  return {
    ...state,
    data: newData,
    indexes: {
      nodes: updatedNodes,
      zones: newZones,
    },
  };
}

/**
 * Duplicate a node and insert the copy after it.
 * O(d) where d = descendants of duplicated node.
 */
export function duplicateNodeInIndex<UserData extends Data>(
  state: PrivateAppState<UserData>,
  config: Config,
  sourceNodeId: string,
  zoneCompound: string,
  sourceIndex: number,
  newItem: ComponentData
): PrivateAppState<UserData> {
  // Simply insert the new item after the source
  return insertNodeToIndex(
    state,
    config,
    newItem,
    zoneCompound,
    sourceIndex + 1
  );
}
