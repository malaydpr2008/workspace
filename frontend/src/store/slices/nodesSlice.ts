import { StateCreator } from 'zustand';
import { WorkspaceState, NodesSlice } from '../types';
import { WorkspaceNode, Character, BreakdownElement } from '@/types/workspace';
import {
  fetchWorkspaces,
  createWorkspace,
  fetchNodes,
  fetchSubtree,
  createNode,
  updateNode,
  deleteNode as apiDeleteNode,
  fetchCharacters,
  fetchBreakdownElements,
} from '@/lib/api';

const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

export function isDebounceActiveForNode(nodeId: string): boolean {
  return Boolean(debounceTimers[nodeId] || debounceTimers[`${nodeId}-title`]);
}

export const createNodesSlice: StateCreator<WorkspaceState, [], [], NodesSlice> = (set, get) => ({
  currentWorkspace: null,
  nodes: {},
  childrenMap: {},
  rootNodeIds: [],
  selectedNodeId: null,
  expandedNodeIds: [],
  lastEditedLocally: {},
  nodeVersions: {},
  isLoading: false,
  saveStatus: 'idle',
  error: null,
  lastError: null,
  activeFilmSuite: 'screenplay',
  workspacesList: [],
  isProjectModalOpen: false,

  setIsProjectModalOpen: (open) => set({ isProjectModalOpen: open }),

  clearLastError: () => set({ lastError: null }),

  setActiveFilmSuite: (suite) => set({ activeFilmSuite: suite }),

  loadWorkspacesList: async () => {
    try {
      const list = await fetchWorkspaces();
      set({ workspacesList: list });
      return list;
    } catch (err) {
      console.error('Failed to load workspaces list', err);
      return [];
    }
  },

  createNewProject: async (name: string, projectType: 'film' | 'novel' | 'article', description = '') => {
    try {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `project-${Date.now()}`;

      const created = await createWorkspace({
        name: name.trim(),
        slug,
        project_type: projectType,
        description: description.trim(),
      });

      await get().loadWorkspacesList();
      await get().switchWorkspace(created.slug);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create new project';
      set({ lastError: msg });
      console.error('Failed to create new project', err);
      return null;
    }
  },

  switchWorkspace: async (slug: string) => {
    Object.keys(debounceTimers).forEach((key) => {
      clearTimeout(debounceTimers[key]);
      delete debounceTimers[key];
    });
    if (saveStatusTimer) {
      clearTimeout(saveStatusTimer);
      saveStatusTimer = null;
    }

    set({
      currentWorkspace: null,
      nodes: {},
      childrenMap: {},
      rootNodeIds: [],
      selectedNodeId: null,
      expandedNodeIds: [],
      characters: {},
      shotsByScene: {},
      breakdownElements: {},
      snapshots: [],
      schedules: [],
      activeScheduleId: null,
      shootingDays: [],
      stripboardItems: [],
      notesByNode: {},
      takesByShot: {},
      adrCues: {},
      audioCuesByScene: {},
      budgets: [],
      activeBudgetId: null,
      milestones: [],
      activityLogs: [],
      coverageReports: [],
      lastEditedLocally: {},
      nodeVersions: {},
      isLoading: true,
      error: null,
      lastError: null,
    });

    await get().loadWorkspace(slug);
  },

  applyRemoteNodeMutation: (
    remoteData: Partial<WorkspaceNode> & { id: string; client_version?: number }
  ) => {
    const nodeId = remoteData.id;
    if (!nodeId) return;

    const { nodes, nodeVersions } = get();
    const existing = nodes[nodeId];
    if (!existing) {
      if (remoteData.title && remoteData.type) {
        set({
          nodes: {
            ...nodes,
            [nodeId]: remoteData as WorkspaceNode,
          },
        });
      }
      return;
    }

    const isContentDebouncing = Boolean(debounceTimers[nodeId]);
    const isTitleDebouncing = Boolean(debounceTimers[`${nodeId}-title`]);

    const currentVersion = nodeVersions[nodeId] || 0;
    if (remoteData.client_version !== undefined && remoteData.client_version < currentVersion) {
      return;
    }

    const merged: WorkspaceNode = {
      ...existing,
      ...remoteData,
    };

    if (isContentDebouncing) {
      merged.content = existing.content;
    }
    if (isTitleDebouncing) {
      merged.title = existing.title;
    }

    set({
      nodes: {
        ...get().nodes,
        [nodeId]: merged,
      },
    });
  },

  isNodeDebouncing: (nodeId: string) => {
    return Boolean(debounceTimers[nodeId] || debounceTimers[`${nodeId}-title`]);
  },

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
        workspacesList: workspaces,
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
    const { nodes, nodeVersions, lastEditedLocally } = get();
    const existing = nodes[nodeId];
    if (!existing) return;
    const previous = { ...existing };

    const now = Date.now();
    const nextVersion = (nodeVersions[nodeId] || 0) + 1;

    // Optimistically update local text field and version counter
    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, content, ...(extraFields || {}) },
      },
      lastEditedLocally: {
        ...lastEditedLocally,
        [nodeId]: now,
      },
      nodeVersions: {
        ...nodeVersions,
        [nodeId]: nextVersion,
      },
      saveStatus: 'saving',
    });

    if (debounceTimers[nodeId]) {
      clearTimeout(debounceTimers[nodeId]);
    }

    debounceTimers[nodeId] = setTimeout(async () => {
      delete debounceTimers[nodeId];
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
    const { nodes, nodeVersions, lastEditedLocally } = get();
    const existing = nodes[nodeId];
    if (!existing) return;
    const previousTitle = existing.title;

    const now = Date.now();
    const timerKey = `${nodeId}-title`;
    const nextVersion = (nodeVersions[nodeId] || 0) + 1;

    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, title },
      },
      lastEditedLocally: {
        ...lastEditedLocally,
        [timerKey]: now,
      },
      nodeVersions: {
        ...nodeVersions,
        [nodeId]: nextVersion,
      },
      saveStatus: 'saving',
    });

    if (debounceTimers[timerKey]) {
      clearTimeout(debounceTimers[timerKey]);
    }

    debounceTimers[timerKey] = setTimeout(async () => {
      delete debounceTimers[timerKey];
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
});
