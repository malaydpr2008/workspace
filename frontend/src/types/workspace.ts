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


