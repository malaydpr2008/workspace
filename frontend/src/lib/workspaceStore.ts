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
  fetchWorkspaceEntities,
  syncWorkspaceEntities,
} from './api';
import type {
  GraphNodeData,
  GraphNodePayload,
  GraphEdgePayload,
  WorkspaceEntity,
  ViewportState,
} from '@/types/workspace';

export type FlowNode = Node<GraphNodeData>;
export type FlowEdge = Edge;

export interface GraphStoreState {
  workspaceId: string | null;
  entities: WorkspaceEntity[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: ViewportState;
  activeTab: 'graph' | 'document';
  focusedNodeId: string | null;
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
  onViewportChange: (viewport: ViewportState) => void;

  // Model C Bi-Directional Actions
  updateEntity: (id: string, patch: Partial<WorkspaceEntity>) => void;
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  focusNodeOnGraph: (nodeIdOrEntityId: string) => void;
  setActiveTab: (tab: 'graph' | 'document') => void;
  setFocusedNodeId: (nodeId: string | null) => void;

  // Graph Persistence Actions
  loadGraph: (workspaceId: string) => Promise<void>;
  syncGraph: (workspaceId?: string) => Promise<void>;
  debouncedSyncGraph: (workspaceId?: string) => void;
  syncEntities: (workspaceId?: string) => Promise<void>;
  debouncedSyncEntities: (workspaceId?: string) => void;

  addNode: (categoryOrData?: string | Partial<FlowNode>, position?: { x: number; y: number }) => Promise<FlowNode | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  toggleNodeCollapse: (nodeId: string) => void;
  setWorkspaceId: (workspaceId: string) => void;
}

let syncGraphTimeout: ReturnType<typeof setTimeout> | null = null;
let syncEntitiesTimeout: ReturnType<typeof setTimeout> | null = null;

export const useGraphStore = create<GraphStoreState>((set, get) => ({
  workspaceId: null,
  entities: [],
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  activeTab: 'graph',
  focusedNodeId: null,
  isLoading: false,
  isSyncing: false,
  syncStatus: 'idle',
  lastSyncedAt: null,
  error: null,

  setWorkspaceId: (workspaceId: string) => set({ workspaceId }),
  setActiveTab: (activeTab: 'graph' | 'document') => set({ activeTab }),
  setFocusedNodeId: (focusedNodeId: string | null) => set({ focusedNodeId }),

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

  onViewportChange: (viewport: ViewportState) => {
    set({ viewport });
    get().debouncedSyncGraph();
  },

  // --------------------------------------------------------------------------
  // Model C Bi-Directional Synchronization Actions
  // --------------------------------------------------------------------------

  updateEntity: (id: string, patch: Partial<WorkspaceEntity>) => {
    const nextContent = patch.content;
    const nextTitle = patch.title;

    set((state) => {
      // 1. Update canonical entity in entities array
      const nextEntities = state.entities.map((ent) => {
        if (ent.id === id) {
          return { ...ent, ...patch };
        }
        return ent;
      });

      // 2. Automatically find linked node(s) and propagate content & title
      const nextNodes = state.nodes.map((node) => {
        if (node.data?.entityId === id) {
          const updatedData: GraphNodeData = {
            ...node.data,
            ...(nextTitle !== undefined ? { title: nextTitle } : {}),
            ...(nextContent !== undefined ? { content: nextContent, text: nextContent } : {}),
            ...(patch.entityType !== undefined ? { entityType: patch.entityType } : {}),
          };
          return {
            ...node,
            data: updatedData,
          };
        }
        return node;
      });

      return {
        entities: nextEntities,
        nodes: nextNodes,
      };
    });

    get().debouncedSyncEntities();
    get().debouncedSyncGraph();
  },

  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => {
    const targetNode = get().nodes.find((n) => n.id === nodeId);
    const linkedEntityId = targetNode?.data?.entityId;

    // 1. Update node data
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...patch,
            },
          };
        }
        return node;
      }),
    }));

    // 2. If node has linked entity, propagate text/content/title to entity
    if (linkedEntityId) {
      const content = patch.content ?? patch.text;
      const title = patch.title;

      if (content !== undefined || title !== undefined) {
        set((state) => ({
          entities: state.entities.map((ent) => {
            if (ent.id === linkedEntityId) {
              return {
                ...ent,
                ...(content !== undefined ? { content: String(content) } : {}),
                ...(title !== undefined ? { title: String(title) } : {}),
              };
            }
            return ent;
          }),
        }));
        get().debouncedSyncEntities();
      }
    }

    get().debouncedSyncGraph();
  },

  focusNodeOnGraph: (nodeIdOrEntityId: string) => {
    const { nodes } = get();
    const matchedNode = nodes.find(
      (n) => n.id === nodeIdOrEntityId || n.data?.entityId === nodeIdOrEntityId
    );
    if (matchedNode) {
      set({
        activeTab: 'graph',
        focusedNodeId: matchedNode.id,
      });
    } else {
      set({ activeTab: 'graph' });
    }
  },

  // --------------------------------------------------------------------------
  // Persistence & Data Loading
  // --------------------------------------------------------------------------

  loadGraph: async (workspaceId: string) => {
    set({ isLoading: true, workspaceId, error: null });
    try {
      const [graphData, entitiesData] = await Promise.all([
        fetchWorkspaceGraph(workspaceId),
        fetchWorkspaceEntities(workspaceId).catch(() => []),
      ]);

      const canonicalEntities = entitiesData.length > 0 ? entitiesData : ((graphData.entities || []) as unknown as WorkspaceEntity[]);

      const loadedViewport =
        graphData.viewport_state ||
        graphData.workspace?.viewport_state || { x: 100, y: 80, zoom: 0.9 };

      const flowNodes: FlowNode[] = (graphData.nodes || []).map((bn: GraphNodePayload) => {
        const posX = bn.position?.x ?? bn.position_x ?? 100;
        const posY = bn.position?.y ?? bn.position_y ?? 100;
        const entityId = bn.entity || bn.entity_id || bn.data?.entityId || null;
        const linkedEntity = entityId ? canonicalEntities.find((e) => e.id === entityId) : null;

        return {
          id: String(bn.id),
          type: bn.type || 'universalNode',
          position: { x: posX, y: posY },
          data: {
            title: linkedEntity?.title || bn.title || 'Untitled Node',
            category: bn.category || 'default',
            entityId,
            entityType: linkedEntity?.entityType || bn.entity_type || bn.data?.entityType || null,
            content: linkedEntity?.content || bn.data?.content || bn.data?.text || '',
            text: linkedEntity?.content || bn.data?.text || bn.data?.content || '',
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
        entities: canonicalEntities,
        nodes: flowNodes,
        edges: flowEdges,
        viewport: loadedViewport,
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
    if (syncGraphTimeout) {
      clearTimeout(syncGraphTimeout);
    }
    set({ syncStatus: 'saving' });
    syncGraphTimeout = setTimeout(() => {
      get().syncGraph(workspaceId);
    }, 600);
  },

  debouncedSyncEntities: (workspaceId?: string) => {
    if (syncEntitiesTimeout) {
      clearTimeout(syncEntitiesTimeout);
    }
    syncEntitiesTimeout = setTimeout(() => {
      get().syncEntities(workspaceId);
    }, 600);
  },

  syncGraph: async (workspaceIdOverride?: string) => {
    const wsId = workspaceIdOverride || get().workspaceId;
    if (!wsId) return;

    set({ isSyncing: true, syncStatus: 'saving' });
    try {
      const { nodes, edges, viewport } = get();

      const payloadNodes: GraphNodePayload[] = nodes.map((n) => ({
        id: n.id,
        entity: n.data?.entityId || null,
        entity_id: n.data?.entityId || null,
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

      await syncWorkspaceGraph(wsId, {
        nodes: payloadNodes,
        edges: payloadEdges,
        viewport_state: viewport,
      });

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

  syncEntities: async (workspaceIdOverride?: string) => {
    const wsId = workspaceIdOverride || get().workspaceId;
    if (!wsId) return;

    try {
      const { entities } = get();
      await syncWorkspaceEntities(wsId, entities);
    } catch (err: unknown) {
      console.error('Failed to sync entities:', err);
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

  toggleNodeCollapse: (nodeId: string) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const currentVal = Boolean(node.data?.is_collapsed);
    get().updateNodeData(nodeId, { is_collapsed: !currentVal });
  },
}));

export const useWorkspaceStore = useGraphStore;
export default useGraphStore;
