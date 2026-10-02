import { Workspace, WorkspaceNode, Character, Shot } from '@/types/workspace';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed [${response.status}]: ${errorBody}`);
  }
  return response.json();
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`${API_BASE_URL}/workspaces/`, {
    cache: 'no-store',
  });
  return handleResponse<Workspace[]>(res);
}

export async function fetchNodes(
  workspaceId: string,
  parentId?: string | null
): Promise<WorkspaceNode[]> {
  const url = new URL(`${API_BASE_URL}/nodes/`);
  url.searchParams.set('workspace_id', workspaceId);
  if (parentId !== undefined) {
    url.searchParams.set('parent_id', parentId === null ? 'null' : parentId);
  }

  const res = await fetch(url.toString(), {
    cache: 'no-store',
  });
  return handleResponse<WorkspaceNode[]>(res);
}

export async function fetchNode(nodeId: string): Promise<WorkspaceNode> {
  const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/`, {
    cache: 'no-store',
  });
  return handleResponse<WorkspaceNode>(res);
}

export async function createNode(nodeData: Partial<WorkspaceNode>): Promise<WorkspaceNode> {
  const res = await fetch(`${API_BASE_URL}/nodes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nodeData),
  });
  return handleResponse<WorkspaceNode>(res);
}

export async function updateNode(
  nodeId: string,
  nodeData: Partial<WorkspaceNode>
): Promise<WorkspaceNode> {
  const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nodeData),
  });
  return handleResponse<WorkspaceNode>(res);
}

export async function fetchShots(sceneId?: string): Promise<Shot[]> {
  const url = new URL(`${API_BASE_URL}/shots/`);
  if (sceneId) {
    url.searchParams.set('scene_id', sceneId);
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
  });
  return handleResponse<Shot[]>(res);
}

export async function fetchCharacters(workspaceId?: string): Promise<Character[]> {
  const url = new URL(`${API_BASE_URL}/characters/`);
  if (workspaceId) {
    url.searchParams.set('workspace_id', workspaceId);
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
  });
  return handleResponse<Character[]>(res);
}

