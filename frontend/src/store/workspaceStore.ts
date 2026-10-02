import { create } from 'zustand';
import { Workspace, WorkspaceNode, Character, Shot } from '@/types/workspace';
import {
  fetchWorkspaces,
  fetchNodes,
  fetchShots,
  fetchCharacters,
  createNode,
} from '@/lib/api';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  nodes: Record<string, WorkspaceNode>;
  childrenMap: Record<string, string[]>;
  rootNodeIds: string[];
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  characters: Record<string, Character>;
  shotsByScene: Record<string, Shot[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadWorkspace: (slug: string) => Promise<void>;
  toggleExpandNode: (nodeId: string) => Promise<void>;
  selectNode: (nodeId: string) => Promise<void>;
  loadNodeChildren: (nodeId: string) => Promise<WorkspaceNode[]>;
  loadSceneShots: (sceneId: string) => Promise<void>;
  createNewNode: (
    type: WorkspaceNode['type'],
    title: string,
    parentId?: string | null
  ) => Promise<WorkspaceNode | null>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  nodes: {},
  childrenMap: {},
  rootNodeIds: [],
  selectedNodeId: null,
  expandedNodeIds: [],
  characters: {},
  shotsByScene: {},
  isLoading: false,
  error: null,

  loadWorkspace: async (slug: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await fetchWorkspaces();
      const workspace =
        workspaces.find((w) => w.slug === slug) ||
        workspaces[0] ||
        null;

      if (!workspace) {
        set({ isLoading: false, error: `Workspace "${slug}" not found.` });
        return;
      }

      // Fetch root nodes and characters in parallel
      const [rootNodes, characterList] = await Promise.all([
        fetchNodes(workspace.id, null),
        fetchCharacters(workspace.id).catch(() => [] as Character[]),
      ]);

      const normalizedNodes: Record<string, WorkspaceNode> = {};
      const rootIds: string[] = [];

      rootNodes.forEach((node) => {
        normalizedNodes[node.id] = node;
        rootIds.push(node.id);
      });

      const characterMap: Record<string, Character> = {};
      characterList.forEach((char) => {
        characterMap[char.id] = char;
      });

      // Default select first root node
      const firstRootId = rootIds[0] || null;

      set({
        currentWorkspace: workspace,
        nodes: normalizedNodes,
        rootNodeIds: rootIds,
        selectedNodeId: firstRootId,
        characters: characterMap,
        isLoading: false,
      });

      // Prefetch children of root nodes for a responsive experience
      if (firstRootId) {
        await get().selectNode(firstRootId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load workspace';
      set({ error: msg, isLoading: false });
    }
  },

  loadNodeChildren: async (nodeId: string) => {
    const { currentWorkspace, nodes, childrenMap } = get();
    if (!currentWorkspace) return [];

    try {
      const children = await fetchNodes(currentWorkspace.id, nodeId);

      const nextNodes = { ...nodes };
      const childIds: string[] = [];

      children.forEach((child) => {
        nextNodes[child.id] = child;
        childIds.push(child.id);
      });

      set({
        nodes: nextNodes,
        childrenMap: {
          ...childrenMap,
          [nodeId]: childIds,
        },
      });

      // If any child is a scene, prefetch shots for it
      for (const child of children) {
        if (child.type === 'scene') {
          get().loadSceneShots(child.id);
          // Also prefetch dialogue/action children of scene
          fetchNodes(currentWorkspace.id, child.id).then((grandChildren) => {
            const currentNodes = get().nodes;
            const updated = { ...currentNodes };
            const grandChildIds: string[] = [];
            grandChildren.forEach((gc) => {
              updated[gc.id] = gc;
              grandChildIds.push(gc.id);
            });
            set({
              nodes: updated,
              childrenMap: {
                ...get().childrenMap,
                [child.id]: grandChildIds,
              },
            });
          });
        }
      }

      return children;
    } catch (err: unknown) {
      console.error('Failed to load children for node', nodeId, err);
      return [];
    }
  },

  toggleExpandNode: async (nodeId: string) => {
    const { expandedNodeIds, childrenMap, loadNodeChildren } = get();
    const isExpanded = expandedNodeIds.includes(nodeId);

    if (isExpanded) {
      set({
        expandedNodeIds: expandedNodeIds.filter((id) => id !== nodeId),
      });
    } else {
      set({
        expandedNodeIds: [...expandedNodeIds, nodeId],
      });

      if (!childrenMap[nodeId]) {
        await loadNodeChildren(nodeId);
      }
    }
  },

  selectNode: async (nodeId: string) => {
    const { nodes, childrenMap, loadNodeChildren, loadSceneShots, expandedNodeIds } = get();
    set({ selectedNodeId: nodeId });

    const targetNode = nodes[nodeId];
    if (!targetNode) return;

    // Auto-expand if selecting a parent node
    if (!expandedNodeIds.includes(nodeId)) {
      set({ expandedNodeIds: [...expandedNodeIds, nodeId] });
    }

    // Load children if not already present
    if (!childrenMap[nodeId]) {
      await loadNodeChildren(nodeId);
    }

    // If node is a scene, load shots
    if (targetNode.type === 'scene') {
      await loadSceneShots(nodeId);
    } else if (targetNode.type === 'screenplay') {
      // Load scenes and scene blocks
      const sceneIds = get().childrenMap[nodeId] || [];
      for (const sceneId of sceneIds) {
        loadSceneShots(sceneId);
        if (!get().childrenMap[sceneId]) {
          loadNodeChildren(sceneId);
        }
      }
    } else if (targetNode.type === 'story') {
      // Load chapters and chapter blocks
      const chapterIds = get().childrenMap[nodeId] || [];
      for (const chapterId of chapterIds) {
        if (!get().childrenMap[chapterId]) {
          loadNodeChildren(chapterId);
        }
      }
    }
  },

  loadSceneShots: async (sceneId: string) => {
    try {
      const shots = await fetchShots(sceneId);
      set((state) => ({
        shotsByScene: {
          ...state.shotsByScene,
          [sceneId]: shots,
        },
      }));
    } catch (err: unknown) {
      console.error('Failed to load shots for scene', sceneId, err);
    }
  },

  createNewNode: async (type, title, parentId = null) => {
    const { currentWorkspace, rootNodeIds, childrenMap, loadNodeChildren } = get();
    if (!currentWorkspace) return null;

    try {
      const rank = `0|h${Date.now()}:`;
      const created = await createNode({
        workspace: currentWorkspace.id,
        parent: parentId,
        type,
        title,
        content: '',
        rank,
        properties: {},
      });

      set((state) => {
        const nextNodes = { ...state.nodes, [created.id]: created };
        if (!parentId) {
          return {
            nodes: nextNodes,
            rootNodeIds: [...rootNodeIds, created.id],
            selectedNodeId: created.id,
          };
        } else {
          const existingChildren = childrenMap[parentId] || [];
          return {
            nodes: nextNodes,
            childrenMap: {
              ...state.childrenMap,
              [parentId]: [...existingChildren, created.id],
            },
            selectedNodeId: created.id,
          };
        }
      });

      if (parentId) {
        await loadNodeChildren(parentId);
      }

      return created;
    } catch (err: unknown) {
      console.error('Failed to create new node', err);
      return null;
    }
  },
}));
