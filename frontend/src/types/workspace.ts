export type NodeType =
  | 'folder'
  | 'screenplay'
  | 'story'
  | 'article'
  | 'scene'
  | 'chapter'
  | 'dialogue'
  | 'action'
  | 'paragraph'
  | 'heading';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export type RevisionColor =
  | 'WHITE'
  | 'BLUE'
  | 'PINK'
  | 'YELLOW'
  | 'GREEN'
  | 'GOLDENROD'
  | 'BUFF'
  | 'SALMON'
  | 'CHERRY';

export interface WorkspaceNode {
  id: string;
  workspace: string;
  parent: string | null;
  type: NodeType;
  rank: string;
  title: string;
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
  revision_color?: RevisionColor;
  is_locked?: boolean;
  revision_asterisk?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  workspace: string;
  name: string;
  avatar: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
}

export interface Shot {
  id: string;
  scene: string;
  shot_number: string;
  shot_type: string;
  lens: string;
  movement?: string;
  storyboard_url: string;
  storyboard_file?: string | null;
  duration_seconds: number;
  blocks?: WorkspaceNode[];
}

export type BreakdownCategory =
  | 'PROP'
  | 'COSTUME'
  | 'VFX'
  | 'SFX'
  | 'LOCATION'
  | 'VEHICLE'
  | 'MAKEUP';

export interface BreakdownElement {
  id: string;
  workspace: string;
  category: BreakdownCategory;
  name: string;
  notes: string;
  block_ids: string[];
  blocks?: WorkspaceNode[];
  created_at: string;
  updated_at: string;
}

export interface DocumentSnapshot {
  id: string;
  workspace: string;
  document_node: string;
  label: string;
  revision_color: RevisionColor;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot_data: any;
  created_at: string;
}

export interface ShootingSchedule {
  id: string;
  workspace: string;
  screenplay: string;
  title: string;
  days_count?: number;
  created_at: string;
}

export interface StripboardItem {
  id: string;
  schedule: string;
  shooting_day: string | null;
  scene: string | null;
  scene_details?: WorkspaceNode;
  is_banner: boolean;
  banner_title: string;
  order: number;
}

export interface ShootingDay {
  id: string;
  schedule: string;
  day_number: number;
  date?: string | null;
  call_time: string;
  shooting_location: string;
  notes: string;
  order: number;
  strips?: StripboardItem[];
}

export type NoteCategory =
  | 'CREATIVE'
  | 'LEGAL'
  | 'CONTINUITY'
  | 'PRODUCTION'
  | 'DIRECTOR';

export type AuthorRole =
  | 'DIRECTOR'
  | 'PRODUCER'
  | 'WRITER'
  | 'LEGAL'
  | 'SCRIPT_SUPERVISOR';

export interface ScriptNote {
  id: string;
  workspace: string;
  node: string;
  author_name: string;
  author_role: AuthorRole;
  category: NoteCategory;
  text: string;
  is_resolved: boolean;
  parent_note: string | null;
  replies?: ScriptNote[];
  created_at: string;
}

export type TakeStatus = 'COMPLETE' | 'INCOMPLETE' | 'FALSE_START';

export interface ProductionTake {
  id: string;
  shot: string;
  take_number: number;
  is_circle_take: boolean;
  status: TakeStatus;
  camera_roll: string;
  sound_roll: string;
  duration_seconds: number;
  notes: string;
  created_at: string;
}

export type ADRReason =
  | 'NOISE'
  | 'PERFORMANCE'
  | 'LINE_CHANGE'
  | 'TV_CLEAN'
  | 'ACCENT'
  | 'OTHER';

export type ADRPriority = 'CRITICAL' | 'STANDARD' | 'OPTIONAL';

export type ADRStatus =
  | 'NEEDS_REVIEW'
  | 'SCHEDULED'
  | 'RECORDED'
  | 'APPROVED'
  | 'OMITTED';

export interface ADRCue {
  id: string;
  workspace: string;
  dialogue_node: string;
  character: string;
  character_name?: string;
  dialogue_content?: string;
  scene_id?: string;
  scene_title?: string;
  cue_number: string;
  reason: ADRReason;
  priority: ADRPriority;
  status: ADRStatus;
  timecode_in: string;
  timecode_out: string;
  actor_notes: string;
  audio_file?: string | null;
  created_at: string;
}

export type AudioCueType =
  | 'SCORE'
  | 'SOURCE_MUSIC'
  | 'FOLEY'
  | 'SFX'
  | 'AMBIENCE';

export type AudioIntensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CLIMACTIC';

export interface AudioSpottingCue {
  id: string;
  workspace: string;
  scene: string;
  scene_title?: string;
  cue_type: AudioCueType;
  cue_name: string;
  timecode_in: string;
  timecode_out: string;
  notes: string;
  intensity: AudioIntensity;
  created_at: string;
}

export type BudgetTier = 'ATL' | 'BTL_PRODUCTION' | 'BTL_POST' | 'OTHER';

export type RateType = 'FLAT' | 'DAILY' | 'WEEKLY' | 'HOURLY' | 'PER_UNIT';

export interface BudgetLineItem {
  id: string;
  category: string;
  account_code: string;
  description: string;
  rate_type: RateType;
  quantity: number;
  rate: string | number;
  fringe_percentage: number;
  actual_cost: string | number;
  estimated_total: number;
  variance: number;
  notes: string;
  character?: string | null;
  character_name?: string;
  breakdown_element?: string | null;
  breakdown_element_name?: string;
}

export interface BudgetCategory {
  id: string;
  budget: string;
  code: string;
  name: string;
  tier: BudgetTier;
  order: number;
  line_items: BudgetLineItem[];
  subtotal_estimated: number;
  subtotal_actual: number;
  subtotal_variance: number;
}

export interface ProductionBudget {
  id: string;
  workspace: string;
  screenplay: string;
  screenplay_title?: string;
  title: string;
  currency: string;
  contingency_percentage: number;
  categories: BudgetCategory[];
  atl_subtotal: number;
  btl_production_subtotal: number;
  btl_post_subtotal: number;
  other_subtotal: number;
  subtotal_before_contingency: number;
  contingency_amount: number;
  grand_total: number;
  actual_total: number;
  variance: number;
  created_at: string;
  updated_at: string;
}

export type ProductionPhase =
  | 'DEVELOPMENT'
  | 'PRE_PRODUCTION'
  | 'PRODUCTION'
  | 'POST_PRODUCTION'
  | 'DELIVERY';

export type MilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export interface ProductionMilestone {
  id: string;
  workspace: string;
  screenplay: string;
  screenplay_title?: string;
  phase: ProductionPhase;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  status: MilestoneStatus;
  progress_percentage: number;
  department: string;
  order: number;
  created_at: string;
}

export type WorkspaceRole =
  | 'OWNER'
  | 'PRODUCER'
  | 'DIRECTOR'
  | 'WRITER'
  | 'DEPT_HEAD'
  | 'ACTOR';

export interface RoleCapabilities {
  canEditScript: boolean;
  canEditBudget: boolean;
  canLockScenes: boolean;
  canManageMembers: boolean;
  canManageBudget?: boolean;
  canManageSchedule?: boolean;
  canManageTeam?: boolean;
  canAddNotes?: boolean;
}

export interface WorkspaceMembership {
  id: string;
  workspace: string;
  workspace_name?: string;
  user?: number | null;
  email: string;
  name: string;
  role: WorkspaceRole;
  role_display?: string;
  department?: string;
  is_active: boolean;
  capabilities?: {
    can_edit_script: boolean;
    can_edit_budget: boolean;
    can_lock_scenes: boolean;
    can_manage_members: boolean;
  };
  created_at: string;
}

export type ActivityActionType =
  | 'SCRIPT_EDIT'
  | 'SCENE_LOCK'
  | 'NOTE_ADDED'
  | 'NOTE_RESOLVED'
  | 'TAKE_LOGGED'
  | 'BUDGET_UPDATE'
  | 'MEMBER_INVITED'
  | string;

export type ActivityDepartment =
  | 'ALL'
  | 'SCRIPT'
  | 'PRODUCTION'
  | 'BUDGET'
  | 'LEGAL'
  | 'SOUND'
  | string;

export interface StudioActivityLog {
  id: string;
  workspace: string;
  workspace_name?: string;
  actor_name: string;
  actor_role: WorkspaceRole | string;
  action_type: ActivityActionType;
  department: ActivityDepartment;
  description: string;
  target_node?: string | null;
  target_node_title?: string | null;
  created_at: string;
}

export interface CollaboratorPresence {
  userId: string;
  userName: string;
  userRole: WorkspaceRole;
  focusedBlockId?: string | null;
  lastSeen: number;
}

export type CoverageVerdict = 'RECOMMEND' | 'CONSIDER' | 'PASS';

export interface ScriptCoverageReport {
  id: string;
  workspace: string;
  workspace_name?: string;
  screenplay: string;
  screenplay_title?: string;
  title: string;
  logline: string;
  verdict: CoverageVerdict;
  commercial_viability: number;
  character_score: number;
  pacing_score: number;
  synopsis: string;
  strengths: string[];
  weaknesses: string[];
  production_notes: string;
  created_at: string;
}

export interface DialoguePunchUpSuggestion {
  variation: string;
  tone: string;
  rationale: string;
}

export interface BreakdownSuggestion {
  name: string;
  category: BreakdownCategory;
  confidence: number;
  reason: string;
}




