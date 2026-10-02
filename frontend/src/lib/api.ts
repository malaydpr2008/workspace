import { Workspace, WorkspaceNode, Character, Shot, BreakdownElement } from '@/types/workspace';

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

export async function deleteNode(nodeId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete node failed [${res.status}]: ${errorBody}`);
  }
}

export async function createShot(shotData: Partial<Shot>): Promise<Shot> {
  const res = await fetch(`${API_BASE_URL}/shots/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shotData),
  });
  return handleResponse<Shot>(res);
}

export async function updateShot(shotId: string, data: Partial<Shot>): Promise<Shot> {
  const res = await fetch(`${API_BASE_URL}/shots/${shotId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Shot>(res);
}

export async function deleteShot(shotId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/shots/${shotId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete shot failed [${res.status}]: ${errorBody}`);
  }
}

export async function createShotCoverage(
  shotId: string,
  blockId: string,
  orderIndex: number = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/shot-coverages/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shot: shotId,
      block: blockId,
      order_index: orderIndex,
    }),
  });
  return handleResponse(res);
}

export async function createCharacter(characterData: Partial<Character>): Promise<Character> {
  const res = await fetch(`${API_BASE_URL}/characters/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(characterData),
  });
  return handleResponse<Character>(res);
}

export async function fetchSubtree(nodeId: string): Promise<WorkspaceNode[]> {
  const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/subtree/`, {
    cache: 'no-store',
  });
  return handleResponse<WorkspaceNode[]>(res);
}

export async function searchWorkspaceNodes(
  workspaceId: string,
  query: string
): Promise<WorkspaceNode[]> {
  const url = new URL(`${API_BASE_URL}/nodes/search/`);
  url.searchParams.set('q', query);
  url.searchParams.set('workspace_id', workspaceId);
  const res = await fetch(url.toString(), {
    cache: 'no-store',
  });
  return handleResponse<WorkspaceNode[]>(res);
}

export async function fetchBreakdownElements(
  workspaceId?: string,
  category?: string
): Promise<BreakdownElement[]> {
  const url = new URL(`${API_BASE_URL}/breakdown-elements/`);
  if (workspaceId) url.searchParams.set('workspace_id', workspaceId);
  if (category) url.searchParams.set('category', category);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<BreakdownElement[]>(res);
}

export async function createBreakdownElement(
  data: Partial<BreakdownElement>
): Promise<BreakdownElement> {
  const res = await fetch(`${API_BASE_URL}/breakdown-elements/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BreakdownElement>(res);
}

export async function updateBreakdownElement(
  id: string,
  data: Partial<BreakdownElement>
): Promise<BreakdownElement> {
  const res = await fetch(`${API_BASE_URL}/breakdown-elements/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BreakdownElement>(res);
}

export async function deleteBreakdownElement(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/breakdown-elements/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete breakdown element failed [${res.status}]: ${errorBody}`);
  }
}

export async function uploadShotImage(
  shotId: string,
  file: File
): Promise<Shot> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/shots/${shotId}/upload_image/`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<Shot>(res);
}




