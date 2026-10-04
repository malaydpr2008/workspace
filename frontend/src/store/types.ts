import {
  Workspace,
  WorkspaceNode,
  Character,
  Shot,
  BreakdownElement,
  DocumentSnapshot,
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
  StudioActivityLog,
  ScriptCoverageReport,
  RevisionColor,
} from '@/types/workspace';

export interface NodesSlice {
  currentWorkspace: Workspace | null;
  nodes: Record<string, WorkspaceNode>;
  childrenMap: Record<string, string[]>;
  rootNodeIds: string[];
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  lastEditedLocally: Record<string, number>;
  nodeVersions: Record<string, number>;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  error: string | null;
  lastError: string | null;
  activeFilmSuite: 'screenplay' | 'storyboard' | 'schedule' | 'budget' | 'analytics';
  workspacesList: Workspace[];
  isProjectModalOpen: boolean;

  setIsProjectModalOpen: (open: boolean) => void;
  setActiveFilmSuite: (suite: 'screenplay' | 'storyboard' | 'schedule' | 'budget' | 'analytics') => void;
  loadWorkspacesList: () => Promise<Workspace[]>;
  createNewProject: (
    name: string,
    projectType: 'film' | 'novel' | 'article',
    description?: string
  ) => Promise<Workspace | null>;
  clearLastError: () => void;
  loadSubtree: (nodeId: string) => Promise<WorkspaceNode[]>;
  loadWorkspace: (slug: string) => Promise<void>;
  switchWorkspace: (slug: string) => Promise<void>;
  applyRemoteNodeMutation: (
    remoteData: Partial<WorkspaceNode> & { id: string; client_version?: number }
  ) => void;
  isNodeDebouncing: (nodeId: string) => boolean;
  toggleExpandNode: (nodeId: string) => Promise<void>;
  selectNode: (nodeId: string) => Promise<void>;
  loadNodeChildren: (nodeId: string) => Promise<WorkspaceNode[]>;
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
  reorderChildNodes: (
    parentId: string,
    newOrderedIds: string[],
    movedNodeId: string,
    newRank: string
  ) => Promise<void>;
}

export interface ProductionSlice {
  characters: Record<string, Character>;
  shotsByScene: Record<string, Shot[]>;
  breakdownElements: Record<string, BreakdownElement>;
  snapshots: DocumentSnapshot[];
  schedules: ShootingSchedule[];
  activeScheduleId: string | null;
  shootingDays: ShootingDay[];
  stripboardItems: StripboardItem[];
  takesByShot: Record<string, ProductionTake[]>;
  adrCues: Record<string, ADRCue[]>;
  audioCuesByScene: Record<string, AudioSpottingCue[]>;
  milestones: ProductionMilestone[];
  coverageReports: ScriptCoverageReport[];

  createWorkspaceCharacter: (name: string) => Promise<Character | null>;
  loadSceneShots: (sceneId: string) => Promise<void>;
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
  uploadShotStoryboard: (shotId: string, file: File, sceneId: string) => Promise<Shot | null>;
  loadBreakdownElements: (workspaceId?: string) => Promise<BreakdownElement[]>;
  addBreakdownElement: (data: Partial<BreakdownElement>) => Promise<BreakdownElement | null>;
  updateBreakdownElementItem: (
    id: string,
    data: Partial<BreakdownElement>
  ) => Promise<BreakdownElement | null>;
  removeBreakdownElement: (id: string) => Promise<void>;
  tagBlockWithElement: (blockId: string, elementId: string) => Promise<void>;
  untagBlockFromElement: (blockId: string, elementId: string) => Promise<void>;
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
  createShootingDayItem: (
    data: Partial<ShootingDay> & { schedule: string; day_number: number }
  ) => Promise<ShootingDay | null>;
  updateShootingDayItem: (id: string, data: Partial<ShootingDay>) => Promise<ShootingDay | null>;
  deleteShootingDayItem: (id: string) => Promise<void>;
  createStripItem: (
    data: Partial<StripboardItem> & { schedule: string }
  ) => Promise<StripboardItem | null>;
  updateStripItem: (id: string, data: Partial<StripboardItem>) => Promise<StripboardItem | null>;
  deleteStripItem: (id: string) => Promise<void>;
  reorderStrips: (items: { id: string; order: number; shooting_day?: string | null }[]) => Promise<void>;
  populateStripsFromScenes: (scheduleId: string, sceneIds: string[]) => Promise<void>;
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
  loadMilestones: (screenplayId: string, workspaceId?: string) => Promise<ProductionMilestone[]>;
  createMilestoneItem: (data: Partial<ProductionMilestone>) => Promise<ProductionMilestone | null>;
  updateMilestoneItem: (id: string, data: Partial<ProductionMilestone>) => Promise<ProductionMilestone | null>;
  deleteMilestoneItem: (id: string) => Promise<void>;
  initDefaultTimeline: (screenplayId: string, workspaceId?: string) => Promise<ProductionMilestone[]>;
  loadCoverageReports: (
    screenplayId: string,
    workspaceId?: string
  ) => Promise<ScriptCoverageReport[]>;
  generateCoverageReportItem: (
    screenplayId: string,
    workspaceId?: string
  ) => Promise<ScriptCoverageReport | null>;
}

export interface BudgetSlice {
  budgets: ProductionBudget[];
  activeBudgetId: string | null;

  loadBudgets: (screenplayId: string, workspaceId?: string) => Promise<ProductionBudget[]>;
  setActiveBudget: (budgetId: string | null) => void;
  createBudgetItem: (data: Partial<ProductionBudget>) => Promise<ProductionBudget | null>;
  updateBudgetItem: (id: string, data: Partial<ProductionBudget>) => Promise<ProductionBudget | null>;
  deleteBudgetItem: (id: string) => Promise<void>;
  autoPopulateBudget: (budgetId: string) => Promise<ProductionBudget | null>;
  createBudgetCategoryItem: (
    data: Partial<BudgetCategory>,
    budgetId: string
  ) => Promise<BudgetCategory | null>;
  updateBudgetCategoryItem: (
    id: string,
    data: Partial<BudgetCategory>,
    budgetId: string
  ) => Promise<BudgetCategory | null>;
  deleteBudgetCategoryItem: (id: string, budgetId: string) => Promise<void>;
  createBudgetLineItemItem: (
    data: Partial<BudgetLineItem>,
    budgetId: string
  ) => Promise<BudgetLineItem | null>;
  updateBudgetLineItemItem: (
    id: string,
    data: Partial<BudgetLineItem>,
    budgetId: string
  ) => Promise<BudgetLineItem | null>;
  deleteBudgetLineItemItem: (id: string, budgetId: string) => Promise<void>;
}

export interface NotesSlice {
  notesByNode: Record<string, ScriptNote[]>;
  activityLogs: StudioActivityLog[];

  loadNotesForNode: (nodeId: string) => Promise<ScriptNote[]>;
  loadNotesForWorkspace: (workspaceId: string) => Promise<ScriptNote[]>;
  createScriptNoteItem: (
    data: Partial<ScriptNote> & { node: string; author_name: string; text: string }
  ) => Promise<ScriptNote | null>;
  toggleResolveScriptNoteItem: (noteId: string, nodeId: string) => Promise<ScriptNote | null>;
  deleteScriptNoteItem: (noteId: string, nodeId: string) => Promise<void>;
  loadActivityLogs: (
    workspaceId: string,
    department?: string,
    actionType?: string
  ) => Promise<StudioActivityLog[]>;
  logStudioAction: (
    actionData: Partial<StudioActivityLog> & {
      workspace: string;
      actor_name: string;
      action_type: string;
      description: string;
      department?: string;
      target_node?: string | null;
    }
  ) => Promise<StudioActivityLog | null>;
}

export type WorkspaceState = NodesSlice & ProductionSlice & BudgetSlice & NotesSlice;
