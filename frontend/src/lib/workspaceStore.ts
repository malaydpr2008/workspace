import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import {
  fetchWorkspaceGraph,
  syncWorkspaceGraph,
  createGraphNode,
  deleteGraphNode,
  createGraphEdge,
  deleteGraphEdge,
} from './api';
import type { GraphNodeData, GraphNodePayload, GraphEdgePayload } from '@/types/workspace';

export type FlowNode = Node<GraphNodeData>;
export type FlowEdge = Edge;

export interface GraphStoreState {
  workspaceId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSyncedAt: Date | null;
  error: string | null;

  // React Flow Actions
  setNodes: (nodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => void;
  setEdges: (edges: FlowEdge[] | ((prev: FlowEdge[]) => FlowEdge[])) => void;
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: OnConnect;

  // Graph Persistence Actions
  loadGraph: (workspaceId: string) => Promise<void>;
  syncGraph: (workspaceId?: string) => Promise<void>;
  debouncedSyncGraph: (workspaceId?: string) => void;
  addNode: (categoryOrData?: string | Partial<FlowNode>, position?: { x: number; y: number }) => Promise<FlowNode | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  updateNodeData: (nodeId: string, partialData: Partial<GraphNodeData>) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  setWorkspaceId: (workspaceId: string) => void;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export const useGraphStore = create<GraphStoreState>((set, get) => ({
  workspaceId: null,
  nodes: [],
  edges: [],
  isLoading: false,
  isSyncing: false,
  syncStatus: 'idle',
  lastSyncedAt: null,
  error: null,

  setWorkspaceId: (workspaceId: string) => set({ workspaceId }),

  setNodes: (nodesOrUpdater) => {
    set((state) => ({
      nodes: typeof nodesOrUpdater === 'function' ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    }));
  },

  setEdges: (edgesOrUpdater) => {
    set((state) => ({
      edges: typeof edgesOrUpdater === 'function' ? edgesOrUpdater(state.edges) : edgesOrUpdater,
    }));
  },

  onNodesChange: (changes: NodeChange<FlowNode>[]) => {
    const nextNodes = applyNodeChanges(changes, get().nodes) as FlowNode[];
    set({ nodes: nextNodes });

    // Determine if changes warrant layout persistence (position, remove, add, etc.)
    const hasPositionOrStructureChange = changes.some(
      (c) => c.type === 'position' || c.type === 'remove' || c.type === 'add'
    );
    if (hasPositionOrStructureChange) {
      get().debouncedSyncGraph();
    }
  },

  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => {
    const nextEdges = applyEdgeChanges(changes, get().edges);
    set({ edges: nextEdges });

    const hasStructureChange = changes.some((c) => c.type === 'remove' || c.type === 'add');
    if (hasStructureChange) {
      get().debouncedSyncGraph();
    }
  },

  onConnect: (connection: Connection) => {
    const edgeId = `xy-edge__${connection.source}${connection.sourceHandle || ''}-${connection.target}${connection.targetHandle || ''}`;
    const newEdge: FlowEdge = {
      ...connection,
      id: edgeId,
      type: 'bezier',
      animated: true,
      style: { strokeWidth: 2, stroke: '#64748b' },
    };
    const nextEdges = addEdge(newEdge, get().edges);
    set({ edges: nextEdges });

    const wsId = get().workspaceId;
    if (wsId) {
      createGraphEdge(wsId, {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      }).catch(() => {
        get().debouncedSyncGraph();
      });
    } else {
      get().debouncedSyncGraph();
    }
  },

  loadGraph: async (workspaceId: string) => {
    set({ isLoading: true, workspaceId, error: null });
    try {
      const graphData = await fetchWorkspaceGraph(workspaceId);

      const flowNodes: FlowNode[] = (graphData.nodes || []).map((bn: GraphNodePayload) => {
        const posX = bn.position?.x ?? bn.position_x ?? 100;
        const posY = bn.position?.y ?? bn.position_y ?? 100;
        return {
          id: String(bn.id),
          type: bn.type || 'universalNode',
          position: { x: posX, y: posY },
          data: {
            title: bn.title || 'Untitled Node',
            category: bn.category || 'default',
            is_collapsed: Boolean(bn.is_collapsed),
            ...(bn.data || {}),
          },
        };
      });

      const flowEdges: FlowEdge[] = (graphData.edges || []).map((be: GraphEdgePayload) => ({
        id: String(be.id),
        source: String(be.source),
        target: String(be.target),
        sourceHandle: be.sourceHandle || be.source_handle || undefined,
        targetHandle: be.targetHandle || be.target_handle || undefined,
        type: 'bezier',
        animated: true,
        style: { strokeWidth: 2, stroke: '#64748b' },
      }));

      set({
        nodes: flowNodes,
        edges: flowEdges,
        isLoading: false,
        syncStatus: 'saved',
        lastSyncedAt: new Date(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load graph';
      set({ error: msg, isLoading: false, syncStatus: 'error' });
    }
  },

  debouncedSyncGraph: (workspaceId?: string) => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    set({ syncStatus: 'saving' });
    syncTimeout = setTimeout(() => {
      get().syncGraph(workspaceId);
    }, 600);
  },

  syncGraph: async (workspaceIdOverride?: string) => {
    const wsId = workspaceIdOverride || get().workspaceId;
    if (!wsId) return;

    set({ isSyncing: true, syncStatus: 'saving' });
    try {
      const { nodes, edges } = get();

      const payloadNodes: GraphNodePayload[] = nodes.map((n) => ({
        id: n.id,
        type: n.type || 'universalNode',
        title: n.data?.title || 'Untitled Node',
        category: n.data?.category || 'default',
        position: n.position,
        position_x: n.position.x,
        position_y: n.position.y,
        data: n.data || {},
        is_collapsed: Boolean(n.data?.is_collapsed),
      }));

      const payloadEdges: GraphEdgePayload[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        source_handle: e.sourceHandle || null,
        target_handle: e.targetHandle || null,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      }));

      await syncWorkspaceGraph(wsId, { nodes: payloadNodes, edges: payloadEdges });

      set({
        isSyncing: false,
        syncStatus: 'saved',
        lastSyncedAt: new Date(),
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync graph';
      set({ isSyncing: false, syncStatus: 'error', error: msg });
    }
  },

  addNode: async (categoryOrData = 'default', position) => {
    const wsId = get().workspaceId;
    const isCategoryString = typeof categoryOrData === 'string';
    const category = isCategoryString ? categoryOrData : categoryOrData.data?.category || 'default';
    const defaultPos = position || {
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };

    let title = 'Untitled Node';
    let inputs: Array<{ id: string; name: string; type?: string }> = [];
    let outputs: Array<{ id: string; name: string; type?: string }> = [];
    let initialData: Record<string, unknown> = {};

    if (category === 'input') {
      title = 'Script Input';
      outputs = [{ id: 'out-text', name: 'Text Stream', type: 'string' }];
      initialData = { text: 'EXT. NEW SCENE - DAY\nEnter scene action or dialogue...' };
    } else if (category === 'transform') {
      title = 'Story Transformer';
      inputs = [{ id: 'in-text', name: 'Source Text', type: 'string' }];
      outputs = [{ id: 'out-processed', name: 'Processed Text', type: 'string' }];
      initialData = { model: 'gpt-4o', temperature: 0.7, style: 'Dramatic' };
    } else if (category === 'output') {
      title = 'Storyboard Output';
      inputs = [{ id: 'in-processed', name: 'Render In', type: 'string' }];
      initialData = { aspectRatio: '16:9', resolution: '4K', status: 'Pending' };
    } else {
      title = 'Universal Node';
      inputs = [{ id: 'in-1', name: 'Input', type: 'any' }];
      outputs = [{ id: 'out-1', name: 'Output', type: 'any' }];
    }

    if (!isCategoryString && categoryOrData.data) {
      initialData = { ...initialData, ...categoryOrData.data };
      if (categoryOrData.data.title) title = categoryOrData.data.title;
      if (categoryOrData.data.inputs) inputs = categoryOrData.data.inputs;
      if (categoryOrData.data.outputs) outputs = categoryOrData.data.outputs;
    }

    const newNodeId = crypto.randomUUID ? crypto.randomUUID() : `node_${Date.now()}`;

    const newNode: FlowNode = {
      id: newNodeId,
      type: 'universalNode',
      position: defaultPos,
      data: {
        title,
        category,
        is_collapsed: false,
        inputs,
        outputs,
        ...initialData,
      },
    };

    set((state) => ({ nodes: [...state.nodes, newNode] }));

    if (wsId) {
      try {
        await createGraphNode(wsId, {
          id: newNodeId,
          type: 'universalNode',
          title,
          category,
          position: defaultPos,
          position_x: defaultPos.x,
          position_y: defaultPos.y,
          data: newNode.data,
          is_collapsed: false,
        });
      } catch {
        // Fallback to debounced sync if individual creation encounters error
        get().debouncedSyncGraph();
      }
    } else {
      get().debouncedSyncGraph();
    }

    return newNode;
  },

  deleteNode: async (nodeId: string) => {
    const wsId = get().workspaceId;
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));

    if (wsId) {
      try {
        await deleteGraphNode(wsId, nodeId);
      } catch {
        get().debouncedSyncGraph();
      }
    }
  },

  deleteEdge: async (edgeId: string) => {
    const wsId = get().workspaceId;
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));

    if (wsId) {
      try {
        await deleteGraphEdge(wsId, edgeId);
      } catch {
        get().debouncedSyncGraph();
      }
    }
  },

  updateNodeData: (nodeId: string, partialData: Partial<GraphNodeData>) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...partialData,
            },
          };
        }
        return node;
      }),
    }));
    get().debouncedSyncGraph();
  },

  toggleNodeCollapse: (nodeId: string) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const currentVal = Boolean(node.data?.is_collapsed);
    get().updateNodeData(nodeId, { is_collapsed: !currentVal });
  },
}));

// Re-export hook as default and named for flexibility
export const useWorkspaceStore = useGraphStore;
export default useGraphStore;
