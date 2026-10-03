import { create } from 'zustand';
import {
  Workspace,
  WorkspaceNode,
  Character,
  Shot,
  BreakdownElement,
  DocumentSnapshot,
  RevisionColor,
  ShootingSchedule,
  ShootingDay,
  StripboardItem,
  ScriptNote,
  ProductionTake,
  ADRCue,
  AudioSpottingCue,
  ProductionBudget,
  BudgetCategory,
  BudgetLineItem,
  ProductionMilestone,
} from '@/types/workspace';
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
  fetchSnapshots,
  createSnapshot,
  restoreSnapshot,
  fetchSchedules,
  createSchedule,
  fetchShootingDays,
  createShootingDay,
  updateShootingDay,
  deleteShootingDay,
  fetchStripboardItems,
  createStripboardItem,
  updateStripboardItem,
  deleteStripboardItem,
  reorderStripboardItems,
  fetchScriptNotes,
  createScriptNote,
  toggleResolveNote,
  deleteScriptNote,
  fetchTakesForShot,
  createProductionTake,
  updateProductionTake,
  toggleCircleTake,
  deleteProductionTake,
  fetchADRCues,
  createADRCue,
  updateADRCueStatus,
  deleteADRCue,
  fetchAudioSpottingCues,
  createAudioSpottingCue,
  deleteAudioSpottingCue,
  fetchBudgets,
  fetchBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  populateBudgetFromWorkspace,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  createBudgetLineItem,
  updateBudgetLineItem,
  deleteBudgetLineItem,
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  initializeDefaultTimeline,
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
  snapshots: DocumentSnapshot[];
  schedules: ShootingSchedule[];
  activeScheduleId: string | null;
  shootingDays: ShootingDay[];
  stripboardItems: StripboardItem[];
  notesByNode: Record<string, ScriptNote[]>;
  takesByShot: Record<string, ProductionTake[]>;
  adrCues: Record<string, ADRCue[]>;
  audioCuesByScene: Record<string, AudioSpottingCue[]>;
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
  loadSnapshots: (documentId: string) => Promise<DocumentSnapshot[]>;
  saveDraftSnapshot: (
    documentId: string,
    label: string,
    revisionColor: RevisionColor
  ) => Promise<DocumentSnapshot | null>;
  restoreDraftSnapshot: (
    snapshotId: string,
    documentId: string
  ) => Promise<boolean>;
  loadSchedules: (screenplayId: string) => Promise<ShootingSchedule[]>;
  setActiveSchedule: (scheduleId: string | null) => Promise<void>;
  createScheduleItem: (screenplayId: string, title: string) => Promise<ShootingSchedule | null>;
  createShootingDayItem: (data: Partial<ShootingDay> & { schedule: string; day_number: number }) => Promise<ShootingDay | null>;
  updateShootingDayItem: (id: string, data: Partial<ShootingDay>) => Promise<ShootingDay | null>;
  deleteShootingDayItem: (id: string) => Promise<void>;
  createStripItem: (data: Partial<StripboardItem> & { schedule: string }) => Promise<StripboardItem | null>;
  updateStripItem: (id: string, data: Partial<StripboardItem>) => Promise<StripboardItem | null>;
  deleteStripItem: (id: string) => Promise<void>;
  reorderStrips: (items: { id: string; order: number; shooting_day?: string | null }[]) => Promise<void>;
  populateStripsFromScenes: (scheduleId: string, sceneIds: string[]) => Promise<void>;
  loadNotesForNode: (nodeId: string) => Promise<ScriptNote[]>;
  loadNotesForWorkspace: (workspaceId: string) => Promise<ScriptNote[]>;
  createScriptNoteItem: (
    data: Partial<ScriptNote> & { node: string; author_name: string; text: string }
  ) => Promise<ScriptNote | null>;
  toggleResolveScriptNoteItem: (noteId: string, nodeId: string) => Promise<ScriptNote | null>;
  deleteScriptNoteItem: (noteId: string, nodeId: string) => Promise<void>;
  loadTakesForShot: (shotId: string) => Promise<ProductionTake[]>;
  createProductionTakeItem: (
    data: Partial<ProductionTake> & { shot: string; take_number: number }
  ) => Promise<ProductionTake | null>;
  updateProductionTakeItem: (
    takeId: string,
    data: Partial<ProductionTake>,
    shotId: string
  ) => Promise<ProductionTake | null>;
  toggleCircleTakeItem: (takeId: string, shotId: string) => Promise<ProductionTake | null>;
  deleteProductionTakeItem: (takeId: string, shotId: string) => Promise<void>;
  loadADRCues: (workspaceId?: string) => Promise<ADRCue[]>;
  createADRCueItem: (
    data: Partial<ADRCue> & { dialogue_node: string; character: string; cue_number: string }
  ) => Promise<ADRCue | null>;
  updateADRCueStatusItem: (cueId: string, status: string, dialogueNodeId: string) => Promise<ADRCue | null>;
  deleteADRCueItem: (cueId: string, dialogueNodeId: string) => Promise<void>;
  loadAudioCuesForScene: (sceneId: string) => Promise<AudioSpottingCue[]>;
  createAudioSpottingCueItem: (
    data: Partial<AudioSpottingCue> & { scene: string; cue_name: string }
  ) => Promise<AudioSpottingCue | null>;
  deleteAudioSpottingCueItem: (cueId: string, sceneId: string) => Promise<void>;
  budgets: ProductionBudget[];
  activeBudgetId: string | null;
  loadBudgets: (screenplayId: string, workspaceId?: string) => Promise<ProductionBudget[]>;
  setActiveBudget: (budgetId: string | null) => void;
  createBudgetItem: (data: Partial<ProductionBudget>) => Promise<ProductionBudget | null>;
  updateBudgetItem: (id: string, data: Partial<ProductionBudget>) => Promise<ProductionBudget | null>;
  deleteBudgetItem: (id: string) => Promise<void>;
  autoPopulateBudget: (budgetId: string) => Promise<ProductionBudget | null>;
  createBudgetCategoryItem: (data: Partial<BudgetCategory>, budgetId: string) => Promise<BudgetCategory | null>;
  updateBudgetCategoryItem: (id: string, data: Partial<BudgetCategory>, budgetId: string) => Promise<BudgetCategory | null>;
  deleteBudgetCategoryItem: (id: string, budgetId: string) => Promise<void>;
  createBudgetLineItemItem: (data: Partial<BudgetLineItem>, budgetId: string) => Promise<BudgetLineItem | null>;
  updateBudgetLineItemItem: (id: string, data: Partial<BudgetLineItem>, budgetId: string) => Promise<BudgetLineItem | null>;
  deleteBudgetLineItemItem: (id: string, budgetId: string) => Promise<void>;
  milestones: ProductionMilestone[];
  loadMilestones: (screenplayId: string, workspaceId?: string) => Promise<ProductionMilestone[]>;
  createMilestoneItem: (data: Partial<ProductionMilestone>) => Promise<ProductionMilestone | null>;
  updateMilestoneItem: (id: string, data: Partial<ProductionMilestone>) => Promise<ProductionMilestone | null>;
  deleteMilestoneItem: (id: string) => Promise<void>;
  initDefaultTimeline: (screenplayId: string, workspaceId?: string) => Promise<ProductionMilestone[]>;
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

  loadSnapshots: async (documentId: string) => {
    try {
      const list = await fetchSnapshots(documentId);
      set({ snapshots: list });
      return list;
    } catch (err) {
      console.error('Failed to load snapshots', err);
      return [];
    }
  },

  saveDraftSnapshot: async (
    documentId: string,
    label: string,
    revisionColor: RevisionColor
  ) => {
    try {
      const subtreeNodes = await fetchSubtree(documentId);
      const snapshot = await createSnapshot({
        document_node: documentId,
        label,
        revision_color: revisionColor,
        snapshot_data: { nodes: subtreeNodes },
      });
      set((state) => ({
        snapshots: [snapshot, ...state.snapshots],
      }));
      return snapshot;
    } catch (err) {
      console.error('Failed to create snapshot', err);
      return null;
    }
  },

  restoreDraftSnapshot: async (snapshotId: string, documentId: string) => {
    try {
      await restoreSnapshot(snapshotId);
      await get().loadSubtree(documentId);
      await get().loadSnapshots(documentId);
      return true;
    } catch (err) {
      console.error('Failed to restore snapshot', err);
      return false;
    }
  },

  loadSchedules: async (screenplayId: string) => {
    try {
      const list = await fetchSchedules(screenplayId);
      set({ schedules: list });
      if (list.length > 0 && !get().activeScheduleId) {
        await get().setActiveSchedule(list[0].id);
      }
      return list;
    } catch (err) {
      console.error('Failed to load schedules', err);
      return [];
    }
  },

  setActiveSchedule: async (scheduleId: string | null) => {
    set({ activeScheduleId: scheduleId });
    if (!scheduleId) {
      set({ shootingDays: [], stripboardItems: [] });
      return;
    }
    try {
      const [days, strips] = await Promise.all([
        fetchShootingDays(scheduleId),
        fetchStripboardItems(scheduleId),
      ]);
      set({
        shootingDays: days.sort((a, b) => a.order - b.order || a.day_number - b.day_number),
        stripboardItems: strips.sort((a, b) => a.order - b.order),
      });
    } catch (err) {
      console.error('Failed to load schedule details', err);
    }
  },

  createScheduleItem: async (screenplayId: string, title: string) => {
    try {
      const created = await createSchedule({
        screenplay: screenplayId,
        title,
      });
      set((state) => ({ schedules: [created, ...state.schedules] }));
      await get().setActiveSchedule(created.id);
      return created;
    } catch (err) {
      console.error('Failed to create schedule', err);
      return null;
    }
  },

  createShootingDayItem: async (data) => {
    try {
      const created = await createShootingDay(data);
      set((state) => ({
        shootingDays: [...state.shootingDays, created].sort(
          (a, b) => a.order - b.order || a.day_number - b.day_number
        ),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create shooting day', err);
      return null;
    }
  },

  updateShootingDayItem: async (id, data) => {
    try {
      const updated = await updateShootingDay(id, data);
      set((state) => ({
        shootingDays: state.shootingDays.map((d) => (d.id === id ? updated : d)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update shooting day', err);
      return null;
    }
  },

  deleteShootingDayItem: async (id) => {
    try {
      await deleteShootingDay(id);
      set((state) => ({
        shootingDays: state.shootingDays.filter((d) => d.id !== id),
        stripboardItems: state.stripboardItems.map((s) =>
          s.shooting_day === id ? { ...s, shooting_day: null } : s
        ),
      }));
    } catch (err) {
      console.error('Failed to delete shooting day', err);
    }
  },

  createStripItem: async (data) => {
    try {
      const created = await createStripboardItem(data);
      set((state) => ({
        stripboardItems: [...state.stripboardItems, created].sort((a, b) => a.order - b.order),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create strip item', err);
      return null;
    }
  },

  updateStripItem: async (id, data) => {
    try {
      const updated = await updateStripboardItem(id, data);
      set((state) => ({
        stripboardItems: state.stripboardItems.map((s) => (s.id === id ? updated : s)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update strip item', err);
      return null;
    }
  },

  deleteStripItem: async (id) => {
    try {
      await deleteStripboardItem(id);
      set((state) => ({
        stripboardItems: state.stripboardItems.filter((s) => s.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete strip item', err);
    }
  },

  reorderStrips: async (items) => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    set((state) => ({
      stripboardItems: state.stripboardItems
        .map((s) => {
          const patch = itemMap.get(s.id);
          if (patch) {
            return {
              ...s,
              order: patch.order,
              shooting_day:
                patch.shooting_day !== undefined ? patch.shooting_day : s.shooting_day,
            };
          }
          return s;
        })
        .sort((a, b) => a.order - b.order),
    }));

    try {
      await reorderStripboardItems(items);
    } catch (err) {
      console.error('Failed to persist strip reordering', err);
    }
  },

  populateStripsFromScenes: async (scheduleId: string, sceneIds: string[]) => {
    try {
      const currentStrips = get().stripboardItems;
      const existingSceneIds = new Set(
        currentStrips.map((s) => s.scene).filter(Boolean)
      );

      let currentOrder = currentStrips.length;
      const toCreate = sceneIds.filter((id) => !existingSceneIds.has(id));

      for (const sceneId of toCreate) {
        currentOrder++;
        await createStripboardItem({
          schedule: scheduleId,
          scene: sceneId,
          shooting_day: null,
          is_banner: false,
          order: currentOrder,
        });
      }

      const refreshed = await fetchStripboardItems(scheduleId);
      set({ stripboardItems: refreshed.sort((a, b) => a.order - b.order) });
    } catch (err) {
      console.error('Failed to populate strips from scenes', err);
    }
  },

  loadNotesForNode: async (nodeId: string) => {
    try {
      const list = await fetchScriptNotes(nodeId);
      set((state) => ({
        notesByNode: {
          ...state.notesByNode,
          [nodeId]: list,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load notes for node', nodeId, err);
      return [];
    }
  },

  loadNotesForWorkspace: async (workspaceId: string) => {
    try {
      const list = await fetchScriptNotes(undefined, workspaceId);
      const grouped: Record<string, ScriptNote[]> = {};
      list.forEach((n) => {
        const nid = n.node;
        if (!grouped[nid]) grouped[nid] = [];
        grouped[nid].push(n);
      });
      set((state) => ({
        notesByNode: {
          ...state.notesByNode,
          ...grouped,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load notes for workspace', workspaceId, err);
      return [];
    }
  },

  createScriptNoteItem: async (data) => {
    try {
      const created = await createScriptNote(data);
      const nodeId = data.node;
      set((state) => {
        const current = state.notesByNode[nodeId] || [];
        if (data.parent_note) {
          return {
            notesByNode: {
              ...state.notesByNode,
              [nodeId]: current.map((n) =>
                n.id === data.parent_note
                  ? { ...n, replies: [...(n.replies || []), created] }
                  : n
              ),
            },
          };
        }
        return {
          notesByNode: {
            ...state.notesByNode,
            [nodeId]: [...current, created],
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create script note', err);
      return null;
    }
  },

  toggleResolveScriptNoteItem: async (noteId: string, nodeId: string) => {
    try {
      const updated = await toggleResolveNote(noteId);
      set((state) => {
        const current = state.notesByNode[nodeId] || [];
        return {
          notesByNode: {
            ...state.notesByNode,
            [nodeId]: current.map((n) =>
              n.id === noteId ? { ...n, is_resolved: updated.is_resolved } : n
            ),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to toggle resolve script note', err);
      return null;
    }
  },

  deleteScriptNoteItem: async (noteId: string, nodeId: string) => {
    try {
      await deleteScriptNote(noteId);
      set((state) => {
        const current = state.notesByNode[nodeId] || [];
        return {
          notesByNode: {
            ...state.notesByNode,
            [nodeId]: current.filter((n) => n.id !== noteId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete script note', err);
    }
  },

  loadTakesForShot: async (shotId: string) => {
    try {
      const list = await fetchTakesForShot(shotId);
      set((state) => ({
        takesByShot: {
          ...state.takesByShot,
          [shotId]: list.sort((a, b) => a.take_number - b.take_number),
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load takes for shot', shotId, err);
      return [];
    }
  },

  createProductionTakeItem: async (data) => {
    try {
      const created = await createProductionTake(data);
      const shotId = data.shot;
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: [...current, created].sort((a, b) => a.take_number - b.take_number),
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create production take', err);
      return null;
    }
  },

  updateProductionTakeItem: async (takeId: string, data, shotId: string) => {
    try {
      const updated = await updateProductionTake(takeId, data);
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: current.map((t) => (t.id === takeId ? updated : t)),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to update production take', err);
      return null;
    }
  },

  toggleCircleTakeItem: async (takeId: string, shotId: string) => {
    try {
      const updated = await toggleCircleTake(takeId);
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: current.map((t) =>
              t.id === takeId ? { ...t, is_circle_take: updated.is_circle_take } : t
            ),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to toggle circle take', err);
      return null;
    }
  },

  deleteProductionTakeItem: async (takeId: string, shotId: string) => {
    try {
      await deleteProductionTake(takeId);
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: current.filter((t) => t.id !== takeId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete production take', err);
    }
  },

  loadADRCues: async (workspaceId?: string) => {
    try {
      const list = await fetchADRCues({ workspace: workspaceId });
      const grouped: Record<string, ADRCue[]> = {};
      list.forEach((c) => {
        const nid = c.dialogue_node;
        if (!grouped[nid]) grouped[nid] = [];
        grouped[nid].push(c);
      });
      set((state) => ({
        adrCues: {
          ...state.adrCues,
          ...grouped,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load ADR cues', err);
      return [];
    }
  },

  createADRCueItem: async (data) => {
    try {
      const created = await createADRCue(data);
      const nid = data.dialogue_node;
      set((state) => {
        const current = state.adrCues[nid] || [];
        return {
          adrCues: {
            ...state.adrCues,
            [nid]: [...current, created],
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create ADR cue', err);
      return null;
    }
  },

  updateADRCueStatusItem: async (cueId: string, status: string, dialogueNodeId: string) => {
    try {
      const updated = await updateADRCueStatus(cueId, status);
      set((state) => {
        const current = state.adrCues[dialogueNodeId] || [];
        return {
          adrCues: {
            ...state.adrCues,
            [dialogueNodeId]: current.map((c) =>
              c.id === cueId ? { ...c, status: updated.status } : c
            ),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to update ADR cue status', err);
      return null;
    }
  },

  deleteADRCueItem: async (cueId: string, dialogueNodeId: string) => {
    try {
      await deleteADRCue(cueId);
      set((state) => {
        const current = state.adrCues[dialogueNodeId] || [];
        return {
          adrCues: {
            ...state.adrCues,
            [dialogueNodeId]: current.filter((c) => c.id !== cueId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete ADR cue', err);
    }
  },

  loadAudioCuesForScene: async (sceneId: string) => {
    try {
      const list = await fetchAudioSpottingCues({ scene: sceneId });
      set((state) => ({
        audioCuesByScene: {
          ...state.audioCuesByScene,
          [sceneId]: list,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load audio cues for scene', sceneId, err);
      return [];
    }
  },

  createAudioSpottingCueItem: async (data) => {
    try {
      const created = await createAudioSpottingCue(data);
      const sid = data.scene;
      set((state) => {
        const current = state.audioCuesByScene[sid] || [];
        return {
          audioCuesByScene: {
            ...state.audioCuesByScene,
            [sid]: [...current, created],
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create audio spotting cue', err);
      return null;
    }
  },

  deleteAudioSpottingCueItem: async (cueId: string, sceneId: string) => {
    try {
      await deleteAudioSpottingCue(cueId);
      set((state) => {
        const current = state.audioCuesByScene[sceneId] || [];
        return {
          audioCuesByScene: {
            ...state.audioCuesByScene,
            [sceneId]: current.filter((c) => c.id !== cueId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete audio spotting cue', err);
    }
  },

  loadBudgets: async (screenplayId: string, workspaceId?: string) => {
    try {
      const budgets = await fetchBudgets(screenplayId, workspaceId);
      set({
        budgets,
        activeBudgetId: budgets[0]?.id || null,
      });
      return budgets;
    } catch (err) {
      console.error('Failed to load budgets', err);
      return [];
    }
  },

  setActiveBudget: (budgetId: string | null) => {
    set({ activeBudgetId: budgetId });
  },

  createBudgetItem: async (data: Partial<ProductionBudget>) => {
    try {
      const created = await createBudget(data);
      set((state) => ({
        budgets: [created, ...state.budgets],
        activeBudgetId: created.id,
      }));
      return created;
    } catch (err) {
      console.error('Failed to create budget', err);
      return null;
    }
  },

  updateBudgetItem: async (id: string, data: Partial<ProductionBudget>) => {
    try {
      const updated = await updateBudget(id, data);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? updated : b)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update budget', err);
      return null;
    }
  },

  deleteBudgetItem: async (id: string) => {
    try {
      await deleteBudget(id);
      set((state) => {
        const remaining = state.budgets.filter((b) => b.id !== id);
        return {
          budgets: remaining,
          activeBudgetId: state.activeBudgetId === id ? remaining[0]?.id || null : state.activeBudgetId,
        };
      });
    } catch (err) {
      console.error('Failed to delete budget', err);
    }
  },

  autoPopulateBudget: async (budgetId: string) => {
    try {
      const populated = await populateBudgetFromWorkspace(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? populated : b)),
      }));
      return populated;
    } catch (err) {
      console.error('Failed to auto-populate budget', err);
      return null;
    }
  },

  createBudgetCategoryItem: async (data: Partial<BudgetCategory>, budgetId: string) => {
    try {
      const created = await createBudgetCategory(data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create budget category', err);
      return null;
    }
  },

  updateBudgetCategoryItem: async (id: string, data: Partial<BudgetCategory>, budgetId: string) => {
    try {
      const updated = await updateBudgetCategory(id, data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update budget category', err);
      return null;
    }
  },

  deleteBudgetCategoryItem: async (id: string, budgetId: string) => {
    try {
      await deleteBudgetCategory(id);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
    } catch (err) {
      console.error('Failed to delete budget category', err);
    }
  },

  createBudgetLineItemItem: async (data: Partial<BudgetLineItem>, budgetId: string) => {
    try {
      const created = await createBudgetLineItem(data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create budget line item', err);
      return null;
    }
  },

  updateBudgetLineItemItem: async (id: string, data: Partial<BudgetLineItem>, budgetId: string) => {
    try {
      const updated = await updateBudgetLineItem(id, data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update budget line item', err);
      return null;
    }
  },

  deleteBudgetLineItemItem: async (id: string, budgetId: string) => {
    try {
      await deleteBudgetLineItem(id);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
    } catch (err) {
      console.error('Failed to delete budget line item', err);
    }
  },

  loadMilestones: async (screenplayId: string, workspaceId?: string) => {
    try {
      const milestones = await fetchMilestones({ screenplay: screenplayId, workspace: workspaceId });
      set({ milestones });
      return milestones;
    } catch (err) {
      console.error('Failed to load milestones', err);
      return [];
    }
  },

  createMilestoneItem: async (data: Partial<ProductionMilestone>) => {
    try {
      const created = await createMilestone(data);
      set((state) => ({
        milestones: [...state.milestones, created],
      }));
      return created;
    } catch (err) {
      console.error('Failed to create milestone', err);
      return null;
    }
  },

  updateMilestoneItem: async (id: string, data: Partial<ProductionMilestone>) => {
    try {
      const updated = await updateMilestone(id, data);
      set((state) => ({
        milestones: state.milestones.map((m) => (m.id === id ? updated : m)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update milestone', err);
      return null;
    }
  },

  deleteMilestoneItem: async (id: string) => {
    try {
      await deleteMilestone(id);
      set((state) => ({
        milestones: state.milestones.filter((m) => m.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete milestone', err);
    }
  },

  initDefaultTimeline: async (screenplayId: string, workspaceId?: string) => {
    try {
      const milestones = await initializeDefaultTimeline({ screenplay: screenplayId, workspace: workspaceId });
      set({ milestones });
      return milestones;
    } catch (err) {
      console.error('Failed to initialize default timeline', err);
      return [];
    }
  },
}));

