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

