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
} from '@/types/workspace';

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

export async function fetchSnapshots(documentId?: string): Promise<DocumentSnapshot[]> {
  const url = new URL(`${API_BASE_URL}/snapshots/`);
  if (documentId) {
    url.searchParams.set('document_node', documentId);
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
  });
  return handleResponse<DocumentSnapshot[]>(res);
}

export async function createSnapshot(data: {
  workspace?: string;
  document_node: string;
  label: string;
  revision_color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot_data: any;
}): Promise<DocumentSnapshot> {
  const res = await fetch(`${API_BASE_URL}/snapshots/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<DocumentSnapshot>(res);
}

export async function restoreSnapshot(
  snapshotId: string
): Promise<{ status: string; message: string; nodes_restored: number }> {
  const res = await fetch(`${API_BASE_URL}/snapshots/${snapshotId}/restore/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ status: string; message: string; nodes_restored: number }>(res);
}

// -------------------------------------------------------------
// Shooting Schedules, Shooting Days & Stripboard Items API
// -------------------------------------------------------------

export async function fetchSchedules(
  screenplayId?: string,
  workspaceId?: string
): Promise<ShootingSchedule[]> {
  const url = new URL(`${API_BASE_URL}/schedules/`);
  if (screenplayId) url.searchParams.set('screenplay', screenplayId);
  if (workspaceId) url.searchParams.set('workspace', workspaceId);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ShootingSchedule[]>(res);
}

export async function createSchedule(data: {
  screenplay: string;
  title: string;
  workspace?: string;
}): Promise<ShootingSchedule> {
  const res = await fetch(`${API_BASE_URL}/schedules/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShootingSchedule>(res);
}

export async function updateSchedule(
  id: string,
  data: Partial<ShootingSchedule>
): Promise<ShootingSchedule> {
  const res = await fetch(`${API_BASE_URL}/schedules/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShootingSchedule>(res);
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/schedules/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete schedule failed [${res.status}]: ${errorBody}`);
  }
}

export async function fetchShootingDays(scheduleId: string): Promise<ShootingDay[]> {
  const url = new URL(`${API_BASE_URL}/shooting-days/`);
  url.searchParams.set('schedule', scheduleId);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ShootingDay[]>(res);
}

export async function createShootingDay(
  data: Partial<ShootingDay> & { schedule: string; day_number: number }
): Promise<ShootingDay> {
  const res = await fetch(`${API_BASE_URL}/shooting-days/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShootingDay>(res);
}

export async function updateShootingDay(
  id: string,
  data: Partial<ShootingDay>
): Promise<ShootingDay> {
  const res = await fetch(`${API_BASE_URL}/shooting-days/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ShootingDay>(res);
}

export async function deleteShootingDay(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/shooting-days/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete shooting day failed [${res.status}]: ${errorBody}`);
  }
}

export async function fetchStripboardItems(
  scheduleId: string,
  shootingDayId?: string | null
): Promise<StripboardItem[]> {
  const url = new URL(`${API_BASE_URL}/stripboard-items/`);
  url.searchParams.set('schedule', scheduleId);
  if (shootingDayId !== undefined) {
    url.searchParams.set('shooting_day', shootingDayId === null ? 'null' : shootingDayId);
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<StripboardItem[]>(res);
}

export async function createStripboardItem(
  data: Partial<StripboardItem> & { schedule: string }
): Promise<StripboardItem> {
  const res = await fetch(`${API_BASE_URL}/stripboard-items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<StripboardItem>(res);
}

export async function updateStripboardItem(
  id: string,
  data: Partial<StripboardItem>
): Promise<StripboardItem> {
  const res = await fetch(`${API_BASE_URL}/stripboard-items/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<StripboardItem>(res);
}

export async function deleteStripboardItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/stripboard-items/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete stripboard item failed [${res.status}]: ${errorBody}`);
  }
}

export async function reorderStripboardItems(
  items: { id: string; order: number; shooting_day?: string | null }[]
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/stripboard-items/reorder/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Reorder stripboard items failed [${res.status}]: ${errorBody}`);
  }
}

// -------------------------------------------------------------
// Script Notes / Marginalia API
// -------------------------------------------------------------

export async function fetchScriptNotes(
  nodeId?: string,
  workspaceId?: string,
  category?: string
): Promise<ScriptNote[]> {
  const url = new URL(`${API_BASE_URL}/notes/`);
  if (nodeId) url.searchParams.set('node', nodeId);
  if (workspaceId) url.searchParams.set('workspace', workspaceId);
  if (category) url.searchParams.set('category', category);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ScriptNote[]>(res);
}

export async function createScriptNote(
  data: Partial<ScriptNote> & { node: string; author_name: string; text: string }
): Promise<ScriptNote> {
  const res = await fetch(`${API_BASE_URL}/notes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ScriptNote>(res);
}

export async function toggleResolveNote(noteId: string): Promise<ScriptNote> {
  const res = await fetch(`${API_BASE_URL}/notes/${noteId}/toggle_resolve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<ScriptNote>(res);
}

export async function deleteScriptNote(noteId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/notes/${noteId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete note failed [${res.status}]: ${errorBody}`);
  }
}

// -------------------------------------------------------------
// Production Takes Logger API
// -------------------------------------------------------------

export async function fetchTakesForShot(shotId: string): Promise<ProductionTake[]> {
  const url = new URL(`${API_BASE_URL}/takes/`);
  url.searchParams.set('shot', shotId);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ProductionTake[]>(res);
}

export async function createProductionTake(
  data: Partial<ProductionTake> & { shot: string; take_number: number }
): Promise<ProductionTake> {
  const res = await fetch(`${API_BASE_URL}/takes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionTake>(res);
}

export async function updateProductionTake(
  takeId: string,
  data: Partial<ProductionTake>
): Promise<ProductionTake> {
  const res = await fetch(`${API_BASE_URL}/takes/${takeId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionTake>(res);
}

export async function toggleCircleTake(takeId: string): Promise<ProductionTake> {
  const res = await fetch(`${API_BASE_URL}/takes/${takeId}/toggle_circle/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<ProductionTake>(res);
}

export async function deleteProductionTake(takeId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/takes/${takeId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete take failed [${res.status}]: ${errorBody}`);
  }
}




