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
  storyboard_url: string;
  duration_seconds: number;
}
