import { create } from 'zustand';
import { Workspace, WorkspaceNode, Character, Shot, BreakdownElement } from '@/types/workspace';
import {
  fetchWorkspaces,
  fetchNodes,
  fetchShots,
  fetchCharacters,
  createNode,
  updateNode,
  deleteNode as apiDeleteNode,
  createShot,
  updateShot,
  deleteShot,
  createShotCoverage,
  createCharacter,
  fetchSubtree,
  fetchBreakdownElements,
  createBreakdownElement,
  updateBreakdownElement,
  deleteBreakdownElement,
  uploadShotImage,
} from '@/lib/api';

const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  nodes: Record<string, WorkspaceNode>;
  childrenMap: Record<string, string[]>;
  rootNodeIds: string[];
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  characters: Record<string, Character>;
  shotsByScene: Record<string, Shot[]>;
  breakdownElements: Record<string, BreakdownElement>;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  error: string | null;
  lastError: string | null;

  // Actions
  loadBreakdownElements: (workspaceId?: string) => Promise<BreakdownElement[]>;
  addBreakdownElement: (data: Partial<BreakdownElement>) => Promise<BreakdownElement | null>;
  updateBreakdownElementItem: (id: string, data: Partial<BreakdownElement>) => Promise<BreakdownElement | null>;
  removeBreakdownElement: (id: string) => Promise<void>;
  tagBlockWithElement: (blockId: string, elementId: string) => Promise<void>;
  untagBlockFromElement: (blockId: string, elementId: string) => Promise<void>;
  uploadShotStoryboard: (shotId: string, file: File, sceneId: string) => Promise<Shot | null>;
  clearLastError: () => void;
  loadSubtree: (nodeId: string) => Promise<WorkspaceNode[]>;
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
  updateNodeContent: (
    nodeId: string,
    content: string,
    extraFields?: Partial<WorkspaceNode>
  ) => void;
  updateNodeTitle: (nodeId: string, title: string) => void;
  updateNodeProperties: (
    nodeId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: Record<string, any>
  ) => Promise<void>;
  updateNodeFields: (
    nodeId: string,
    fields: Partial<WorkspaceNode>
  ) => Promise<void>;
  changeBlockType: (
    nodeId: string,
    newType: WorkspaceNode['type'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties?: Record<string, any>
  ) => Promise<void>;
  insertBlock: (
    parentId: string,
    type: WorkspaceNode['type'],
    afterNodeId?: string | null,
    initialContent?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties?: Record<string, any>,
    extraFields?: Partial<WorkspaceNode>
  ) => Promise<WorkspaceNode | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  createSceneShot: (
    sceneId: string,
    shotData: {
      shot_number: string;
      shot_type: string;
      lens: string;
      duration_seconds: number;
      storyboard_url?: string;
      movement?: string;
    }
  ) => Promise<Shot | null>;
  updateSceneShot: (
    shotId: string,
    data: Partial<Shot>,
    sceneId: string
  ) => Promise<Shot | null>;
  removeShot: (shotId: string, sceneId: string) => Promise<void>;
  attachBlockToShot: (
    shotId: string,
    blockId: string,
    sceneId: string
  ) => Promise<void>;
  createWorkspaceCharacter: (name: string) => Promise<Character | null>;
  reorderChildNodes: (
    parentId: string,
    newOrderedIds: string[],
    movedNodeId: string,
    newRank: string
  ) => Promise<void>;
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
  breakdownElements: {},
  isLoading: false,
  saveStatus: 'idle',
  error: null,
  lastError: null,

  clearLastError: () => set({ lastError: null }),

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

      const [rootNodes, characterList, breakdownList] = await Promise.all([
        fetchNodes(workspace.id, null),
        fetchCharacters(workspace.id).catch(() => [] as Character[]),
        fetchBreakdownElements(workspace.id).catch(() => [] as BreakdownElement[]),
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

      const breakdownMap: Record<string, BreakdownElement> = {};
      breakdownList.forEach((el) => {
        breakdownMap[el.id] = el;
      });

      const firstRootId = rootIds[0] || null;

      set({
        currentWorkspace: workspace,
        nodes: normalizedNodes,
        rootNodeIds: rootIds,
        selectedNodeId: firstRootId,
        characters: characterMap,
        breakdownElements: breakdownMap,
        isLoading: false,
      });

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

      // Prefetch shots for scenes and load grandChildren
      for (const child of children) {
        if (child.type === 'scene') {
          get().loadSceneShots(child.id);
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

    if (!expandedNodeIds.includes(nodeId)) {
      set({ expandedNodeIds: [...expandedNodeIds, nodeId] });
    }

    if (!childrenMap[nodeId]) {
      await loadNodeChildren(nodeId);
    }

    if (targetNode.type === 'scene') {
      await loadSceneShots(nodeId);
    } else if (targetNode.type === 'screenplay') {
      const sceneIds = get().childrenMap[nodeId] || [];
      for (const sceneId of sceneIds) {
        loadSceneShots(sceneId);
        if (!get().childrenMap[sceneId]) {
          loadNodeChildren(sceneId);
        }
      }
    } else if (targetNode.type === 'story') {
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

  updateNodeContent: (
    nodeId: string,
    content: string,
    extraFields?: Partial<WorkspaceNode>
  ) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    if (!existing) return;
    const previous = { ...existing };

    // Optimistically update
    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, content, ...(extraFields || {}) },
      },
      saveStatus: 'saving',
    });

    if (debounceTimers[nodeId]) {
      clearTimeout(debounceTimers[nodeId]);
    }

    debounceTimers[nodeId] = setTimeout(async () => {
      try {
        await updateNode(nodeId, { content, ...(extraFields || {}) });
        set({ saveStatus: 'saved' });

        if (saveStatusTimer) clearTimeout(saveStatusTimer);
        saveStatusTimer = setTimeout(() => {
          set({ saveStatus: 'idle' });
        }, 1500);
      } catch (err) {
        console.error('Failed to save content for node', nodeId, err);
        const current = get().nodes[nodeId];
        if (current) {
          set({
            nodes: {
              ...get().nodes,
              [nodeId]: previous,
            },
            saveStatus: 'idle',
            lastError: `Network sync error: content update rolled back.`,
          });
        }
      }
    }, 400);
  },

  updateNodeTitle: (nodeId: string, title: string) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    if (!existing) return;
    const previousTitle = existing.title;

    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, title },
      },
      saveStatus: 'saving',
    });

    if (debounceTimers[`${nodeId}-title`]) {
      clearTimeout(debounceTimers[`${nodeId}-title`]);
    }

    debounceTimers[`${nodeId}-title`] = setTimeout(async () => {
      try {
        await updateNode(nodeId, { title });
        set({ saveStatus: 'saved' });

        if (saveStatusTimer) clearTimeout(saveStatusTimer);
        saveStatusTimer = setTimeout(() => {
          set({ saveStatus: 'idle' });
        }, 1500);
      } catch (err) {
        console.error('Failed to save title for node', nodeId, err);
        const current = get().nodes[nodeId];
        if (current) {
          set({
            nodes: {
              ...get().nodes,
              [nodeId]: { ...current, title: previousTitle },
            },
            saveStatus: 'idle',
            lastError: `Network sync error: title rolled back to "${previousTitle}".`,
          });
        }
      }
    }, 400);
  },

  updateNodeProperties: async (nodeId, properties) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    if (!existing) return;

    const merged = { ...existing.properties, ...properties };
    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, properties: merged },
      },
      saveStatus: 'saving',
    });

    try {
      await updateNode(nodeId, { properties: merged });
      set({ saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 1200);
    } catch (err) {
      console.error('Failed to update properties', nodeId, err);
    }
  },

  updateNodeFields: async (nodeId, fields) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    if (!existing) return;

    const updated = { ...existing, ...fields };
    set({
      nodes: {
        ...nodes,
        [nodeId]: updated,
      },
      saveStatus: 'saving',
    });

    try {
      await updateNode(nodeId, fields);
      set({ saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 1200);
    } catch (err) {
      console.error('Failed to update node fields', nodeId, err);
      set({
        nodes: {
          ...get().nodes,
          [nodeId]: existing,
        },
        saveStatus: 'idle',
      });
    }
  },

  changeBlockType: async (nodeId, newType, properties = {}) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    if (!existing) return;

    const updatedProps = { ...existing.properties, ...properties };
    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, type: newType, properties: updatedProps },
      },
      saveStatus: 'saving',
    });

    try {
      await updateNode(nodeId, { type: newType, properties: updatedProps });
      set({ saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 1200);
    } catch (err) {
      console.error('Failed to change block type', nodeId, err);
    }
  },

  insertBlock: async (
    parentId,
    type,
    afterNodeId = null,
    initialContent = '',
    properties = {},
    extraFields = {}
  ) => {
    const { currentWorkspace, childrenMap, nodes } = get();
    if (!currentWorkspace) return null;

    const childIds = childrenMap[parentId] || [];
    let rank = `0|h${Date.now()}:`;

    if (afterNodeId) {
      const idx = childIds.indexOf(afterNodeId);
      const afterNode = nodes[afterNodeId];
      if (afterNode) {
        rank = `${afterNode.rank}h${Math.floor(Math.random() * 1000)}:`;
      }
      if (idx !== -1 && idx < childIds.length - 1) {
        const nextNode = nodes[childIds[idx + 1]];
        if (nextNode && afterNode) {
          rank = `${afterNode.rank.replace(/:$/, '')}_${nextNode.rank}`;
        }
      }
    }

    try {
      const created = await createNode({
        workspace: currentWorkspace.id,
        parent: parentId,
        type,
        title: extraFields?.title ?? '',
        content: initialContent,
        rank,
        properties,
        ...extraFields,
      });

      const nextChildIds = [...childIds];
      if (afterNodeId) {
        const idx = childIds.indexOf(afterNodeId);
        if (idx !== -1) {
          nextChildIds.splice(idx + 1, 0, created.id);
        } else {
          nextChildIds.push(created.id);
        }
      } else {
        nextChildIds.push(created.id);
      }

      set((state) => ({
        nodes: { ...state.nodes, [created.id]: created },
        childrenMap: {
          ...state.childrenMap,
          [parentId]: nextChildIds,
        },
        saveStatus: 'saved',
      }));

      setTimeout(() => set({ saveStatus: 'idle' }), 1000);
      return created;
    } catch (err) {
      console.error('Failed to insert block', err);
      return null;
    }
  },

  deleteNode: async (nodeId: string) => {
    const { nodes, childrenMap, rootNodeIds } = get();
    const target = nodes[nodeId];
    if (!target) return;

    const parentId = target.parent;

    const nextNodes = { ...nodes };
    delete nextNodes[nodeId];

    const nextRootNodeIds = rootNodeIds.filter((id) => id !== nodeId);

    let nextChildrenMap = { ...childrenMap };
    if (parentId && childrenMap[parentId]) {
      nextChildrenMap = {
        ...nextChildrenMap,
        [parentId]: childrenMap[parentId].filter((id) => id !== nodeId),
      };
    }

    set({
      nodes: nextNodes,
      rootNodeIds: nextRootNodeIds,
      childrenMap: nextChildrenMap,
      selectedNodeId:
        get().selectedNodeId === nodeId
          ? parentId || nextRootNodeIds[0] || null
          : get().selectedNodeId,
      saveStatus: 'saving',
    });

    try {
      await apiDeleteNode(nodeId);
      set({ saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 1000);
    } catch (err) {
      console.error('Failed to delete node', nodeId, err);
    }
  },

  createSceneShot: async (sceneId, shotData) => {
    try {
      const shot = await createShot({
        scene: sceneId,
        ...shotData,
      });

      await get().loadSceneShots(sceneId);
      return shot;
    } catch (err) {
      console.error('Failed to create shot', err);
      return null;
    }
  },

  updateSceneShot: async (shotId, data, sceneId) => {
    try {
      const updated = await updateShot(shotId, data);
      await get().loadSceneShots(sceneId);
      return updated;
    } catch (err) {
      console.error('Failed to update shot', err);
      return null;
    }
  },

  removeShot: async (shotId, sceneId) => {
    try {
      await deleteShot(shotId);
      await get().loadSceneShots(sceneId);
    } catch (err) {
      console.error('Failed to delete shot', err);
    }
  },

  attachBlockToShot: async (shotId, blockId, sceneId) => {
    try {
      await createShotCoverage(shotId, blockId);
      await get().loadSceneShots(sceneId);
    } catch (err) {
      console.error('Failed to attach block to shot', err);
    }
  },

  createWorkspaceCharacter: async (name: string) => {
    const { currentWorkspace, characters } = get();
    if (!currentWorkspace) return null;

    try {
      const created = await createCharacter({
        workspace: currentWorkspace.id,
        name: name.trim(),
        avatar: '',
        metadata: {},
      });

      set({
        characters: {
          ...characters,
          [created.id]: created,
        },
      });

      return created;
    } catch (err) {
      console.error('Failed to create character', err);
      return null;
    }
  },

  reorderChildNodes: async (parentId, newOrderedIds, movedNodeId, newRank) => {
    const { nodes, childrenMap } = get();
    const movedNode = nodes[movedNodeId];
    if (!movedNode) return;

    const previousChildren = childrenMap[parentId] || [];
    const previousRank = movedNode.rank;

    set({
      nodes: {
        ...nodes,
        [movedNodeId]: {
          ...movedNode,
          rank: newRank,
        },
      },
      childrenMap: {
        ...childrenMap,
        [parentId]: newOrderedIds,
      },
      saveStatus: 'saving',
    });

    try {
      await updateNode(movedNodeId, { rank: newRank });
      set({ saveStatus: 'saved' });
      if (saveStatusTimer) clearTimeout(saveStatusTimer);
      saveStatusTimer = setTimeout(() => {
        set({ saveStatus: 'idle' });
      }, 1500);
    } catch (err) {
      console.error('Failed to update node rank', err);
      const current = get().nodes[movedNodeId];
      set({
        nodes: {
          ...get().nodes,
          [movedNodeId]: current ? { ...current, rank: previousRank } : current,
        },
        childrenMap: {
          ...get().childrenMap,
          [parentId]: previousChildren,
        },
        saveStatus: 'idle',
        lastError: `Network error: failed to reorder node. Order restored.`,
      });
    }
  },

  loadSubtree: async (nodeId: string) => {
    try {
      const subNodes = await fetchSubtree(nodeId);
      const { nodes, childrenMap } = get();
      const newNodes = { ...nodes };
      const newChildrenMap = { ...childrenMap };

      subNodes.forEach((node) => {
        newNodes[node.id] = node;
        if (node.parent) {
          if (!newChildrenMap[node.parent]) {
            newChildrenMap[node.parent] = [];
          }
          if (!newChildrenMap[node.parent].includes(node.id)) {
            newChildrenMap[node.parent].push(node.id);
          }
        }
      });

      set({
        nodes: newNodes,
        childrenMap: newChildrenMap,
      });
      return subNodes;
    } catch (err) {
      console.error('Failed to load subtree', err);
      return [];
    }
  },

  loadBreakdownElements: async (workspaceId?: string) => {
    const wsId = workspaceId || get().currentWorkspace?.id;
    if (!wsId) return [];
    try {
      const elements = await fetchBreakdownElements(wsId);
      const elementsMap: Record<string, BreakdownElement> = {};
      elements.forEach((el) => {
        elementsMap[el.id] = el;
      });
      set({ breakdownElements: elementsMap });
      return elements;
    } catch (err) {
      console.error('Failed to load breakdown elements', err);
      return [];
    }
  },

  addBreakdownElement: async (data: Partial<BreakdownElement>) => {
    const wsId = data.workspace || get().currentWorkspace?.id;
    if (!wsId) return null;
    try {
      const created = await createBreakdownElement({ ...data, workspace: wsId });
      set({
        breakdownElements: {
          ...get().breakdownElements,
          [created.id]: created,
        },
      });
      return created;
    } catch (err) {
      console.error('Failed to add breakdown element', err);
      return null;
    }
  },

  updateBreakdownElementItem: async (id: string, data: Partial<BreakdownElement>) => {
    try {
      const updated = await updateBreakdownElement(id, data);
      set({
        breakdownElements: {
          ...get().breakdownElements,
          [id]: updated,
        },
      });
      return updated;
    } catch (err) {
      console.error('Failed to update breakdown element', err);
      return null;
    }
  },

  removeBreakdownElement: async (id: string) => {
    try {
      await deleteBreakdownElement(id);
      const nextMap = { ...get().breakdownElements };
      delete nextMap[id];
      set({ breakdownElements: nextMap });
    } catch (err) {
      console.error('Failed to delete breakdown element', err);
    }
  },

  tagBlockWithElement: async (blockId: string, elementId: string) => {
    const element = get().breakdownElements[elementId];
    if (!element) return;
    const currentBlockIds = element.block_ids || [];
    if (currentBlockIds.includes(blockId)) return;
    const newBlockIds = [...currentBlockIds, blockId];
    await get().updateBreakdownElementItem(elementId, { block_ids: newBlockIds });
  },

  untagBlockFromElement: async (blockId: string, elementId: string) => {
    const element = get().breakdownElements[elementId];
    if (!element) return;
    const currentBlockIds = element.block_ids || [];
    const newBlockIds = currentBlockIds.filter((id) => id !== blockId);
    await get().updateBreakdownElementItem(elementId, { block_ids: newBlockIds });
  },

  uploadShotStoryboard: async (shotId: string, file: File, sceneId: string) => {
    try {
      const updatedShot = await uploadShotImage(shotId, file);
      await get().loadSceneShots(sceneId);
      return updatedShot;
    } catch (err) {
      console.error('Failed to upload shot storyboard', err);
      return null;
    }
  },
}));

