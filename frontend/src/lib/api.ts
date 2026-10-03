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
  WorkspaceMembership,
  WorkspaceRole,
  RoleCapabilities,
  StudioActivityLog,
  ScriptCoverageReport,
  DialoguePunchUpSuggestion,
  BreakdownSuggestion,
  GraphNodePayload,
  GraphEdgePayload,
  WorkspaceGraphResponse,
} from '@/types/workspace';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const clientUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      '/api';
    const trimmed = clientUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  const serverUrl =
    process.env.INTERNAL_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';
  const trimmed = serverUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = getApiBaseUrl();

export function buildApiUrl(endpoint: string): URL {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  const full = `${base}${cleanEndpoint}`;

  if (full.startsWith('http://') || full.startsWith('https://')) {
    return new URL(full);
  }

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000');

  return new URL(full, origin);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let cleanMessage = `API request failed [${response.status}]`;
    if (isJson) {
      try {
        const errorJson = await response.json();
        cleanMessage =
          errorJson.detail ||
          errorJson.error ||
          errorJson.message ||
          (typeof errorJson === 'string' ? errorJson : JSON.stringify(errorJson));
      } catch {
        cleanMessage = `API request failed [${response.status}]: ${response.statusText}`;
      }
    } else {
      const text = await response.text();
      if (response.status === 404 || text.includes('404')) {
        cleanMessage = 'Backend endpoint not found (404). Verify API route and service health.';
      } else if (text.trim().startsWith('<') || text.includes('{"children":')) {
        cleanMessage = `Server returned invalid response (${response.status}).`;
      } else if (text.trim().length > 0 && text.trim().length < 200) {
        cleanMessage = text.trim();
      }
    }
    throw new Error(cleanMessage);
  }

  if (!isJson) {
    throw new Error('Expected JSON response from backend, but received non-JSON payload.');
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
  const url = buildApiUrl('/nodes/');
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
  const url = buildApiUrl('/shots/');
  if (sceneId) {
    url.searchParams.set('scene_id', sceneId);
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
  });
  return handleResponse<Shot[]>(res);
}

export async function fetchCharacters(workspaceId?: string): Promise<Character[]> {
  const url = buildApiUrl('/characters/');
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
  const url = buildApiUrl('/nodes/search/');
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
  const url = buildApiUrl('/breakdown-elements/');
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
  const url = buildApiUrl('/snapshots/');
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
  const url = buildApiUrl('/schedules/');
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
  const url = buildApiUrl('/shooting-days/');
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
  const url = buildApiUrl('/stripboard-items/');
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
  const url = buildApiUrl('/notes/');
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
  const url = buildApiUrl('/takes/');
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

// -------------------------------------------------------------
// ADR Studio & Audio Spotting API
// -------------------------------------------------------------

export async function fetchADRCues(params?: {
  workspace?: string;
  character?: string;
  status?: string;
  dialogue_node?: string;
}): Promise<ADRCue[]> {
  const url = buildApiUrl('/adr-cues/');
  if (params?.workspace) url.searchParams.set('workspace', params.workspace);
  if (params?.character) url.searchParams.set('character', params.character);
  if (params?.status) url.searchParams.set('status', params.status);
  if (params?.dialogue_node) url.searchParams.set('dialogue_node', params.dialogue_node);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ADRCue[]>(res);
}

export async function createADRCue(
  data: Partial<ADRCue> & { dialogue_node: string; character: string; cue_number: string }
): Promise<ADRCue> {
  const res = await fetch(`${API_BASE_URL}/adr-cues/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ADRCue>(res);
}

export async function updateADRCue(
  cueId: string,
  data: Partial<ADRCue>
): Promise<ADRCue> {
  const res = await fetch(`${API_BASE_URL}/adr-cues/${cueId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ADRCue>(res);
}

export async function updateADRCueStatus(
  cueId: string,
  status: string
): Promise<ADRCue> {
  const res = await fetch(`${API_BASE_URL}/adr-cues/${cueId}/update_status/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse<ADRCue>(res);
}

export async function deleteADRCue(cueId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/adr-cues/${cueId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete ADR cue failed [${res.status}]: ${errorBody}`);
  }
}

export async function fetchAudioSpottingCues(params?: {
  workspace?: string;
  scene?: string;
  cue_type?: string;
}): Promise<AudioSpottingCue[]> {
  const url = buildApiUrl('/audio-cues/');
  if (params?.workspace) url.searchParams.set('workspace', params.workspace);
  if (params?.scene) url.searchParams.set('scene', params.scene);
  if (params?.cue_type) url.searchParams.set('cue_type', params.cue_type);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<AudioSpottingCue[]>(res);
}

export async function createAudioSpottingCue(
  data: Partial<AudioSpottingCue> & { scene: string; cue_name: string }
): Promise<AudioSpottingCue> {
  const res = await fetch(`${API_BASE_URL}/audio-cues/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AudioSpottingCue>(res);
}

export async function updateAudioSpottingCue(
  cueId: string,
  data: Partial<AudioSpottingCue>
): Promise<AudioSpottingCue> {
  const res = await fetch(`${API_BASE_URL}/audio-cues/${cueId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AudioSpottingCue>(res);
}

export async function deleteAudioSpottingCue(cueId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/audio-cues/${cueId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete audio spotting cue failed [${res.status}]: ${errorBody}`);
  }
}

// -------------------------------------------------------------
// Production Budget & Department Ledger API
// -------------------------------------------------------------

export async function fetchBudgets(screenplayId?: string, workspaceId?: string): Promise<ProductionBudget[]> {
  const url = buildApiUrl('/budgets/');
  if (screenplayId) url.searchParams.set('screenplay', screenplayId);
  if (workspaceId) url.searchParams.set('workspace', workspaceId);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ProductionBudget[]>(res);
}

export async function fetchBudget(budgetId: string): Promise<ProductionBudget> {
  const res = await fetch(`${API_BASE_URL}/budgets/${budgetId}/`, { cache: 'no-store' });
  return handleResponse<ProductionBudget>(res);
}

export async function createBudget(data: Partial<ProductionBudget>): Promise<ProductionBudget> {
  const res = await fetch(`${API_BASE_URL}/budgets/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionBudget>(res);
}

export async function updateBudget(id: string, data: Partial<ProductionBudget>): Promise<ProductionBudget> {
  const res = await fetch(`${API_BASE_URL}/budgets/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionBudget>(res);
}

export async function deleteBudget(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/budgets/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete budget failed [${res.status}]: ${errorBody}`);
  }
}

export async function populateBudgetFromWorkspace(budgetId: string): Promise<ProductionBudget> {
  const res = await fetch(`${API_BASE_URL}/budgets/${budgetId}/populate_from_workspace/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<ProductionBudget>(res);
}

export async function createBudgetCategory(data: Partial<BudgetCategory>): Promise<BudgetCategory> {
  const res = await fetch(`${API_BASE_URL}/budget-categories/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetCategory>(res);
}

export async function updateBudgetCategory(id: string, data: Partial<BudgetCategory>): Promise<BudgetCategory> {
  const res = await fetch(`${API_BASE_URL}/budget-categories/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetCategory>(res);
}

export async function deleteBudgetCategory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/budget-categories/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete budget category failed [${res.status}]: ${errorBody}`);
  }
}

export async function createBudgetLineItem(data: Partial<BudgetLineItem>): Promise<BudgetLineItem> {
  const res = await fetch(`${API_BASE_URL}/budget-line-items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetLineItem>(res);
}

export async function updateBudgetLineItem(id: string, data: Partial<BudgetLineItem>): Promise<BudgetLineItem> {
  const res = await fetch(`${API_BASE_URL}/budget-line-items/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetLineItem>(res);
}

export async function deleteBudgetLineItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/budget-line-items/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete budget line item failed [${res.status}]: ${errorBody}`);
  }
}

// -------------------------------------------------------------
// Production Milestones & Timeline API
// -------------------------------------------------------------

export async function fetchMilestones(params?: {
  screenplay?: string;
  workspace?: string;
  phase?: string;
}): Promise<ProductionMilestone[]> {
  const url = buildApiUrl('/milestones/');
  if (params?.screenplay) url.searchParams.set('screenplay', params.screenplay);
  if (params?.workspace) url.searchParams.set('workspace', params.workspace);
  if (params?.phase) url.searchParams.set('phase', params.phase);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ProductionMilestone[]>(res);
}

export async function createMilestone(
  data: Partial<ProductionMilestone>
): Promise<ProductionMilestone> {
  const res = await fetch(`${API_BASE_URL}/milestones/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionMilestone>(res);
}

export async function updateMilestone(
  id: string,
  data: Partial<ProductionMilestone>
): Promise<ProductionMilestone> {
  const res = await fetch(`${API_BASE_URL}/milestones/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionMilestone>(res);
}

export async function deleteMilestone(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/milestones/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete milestone failed [${res.status}]: ${errorBody}`);
  }
}

export async function initializeDefaultTimeline(data: {
  screenplay: string;
  workspace?: string;
}): Promise<ProductionMilestone[]> {
  const res = await fetch(`${API_BASE_URL}/milestones/initialize_default_timeline/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ProductionMilestone[]>(res);
}

export async function fetchMemberships(
  workspaceId: string,
  role?: string
): Promise<WorkspaceMembership[]> {
  const url = buildApiUrl('/memberships/');
  url.searchParams.set('workspace', workspaceId);
  if (role) url.searchParams.set('role', role);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<WorkspaceMembership[]>(res);
}

export async function createMembership(
  data: Partial<WorkspaceMembership> & { workspace: string; email: string; name: string }
): Promise<WorkspaceMembership> {
  const res = await fetch(`${API_BASE_URL}/memberships/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<WorkspaceMembership>(res);
}

export async function updateMembership(
  id: string,
  data: Partial<WorkspaceMembership>
): Promise<WorkspaceMembership> {
  const res = await fetch(`${API_BASE_URL}/memberships/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<WorkspaceMembership>(res);
}

export async function deleteMembership(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/memberships/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete membership failed [${res.status}]: ${errorBody}`);
  }
}

export async function fetchCurrentUserRole(
  workspaceId: string,
  email?: string
): Promise<{
  role: WorkspaceRole;
  capabilities: RoleCapabilities;
  membership?: WorkspaceMembership | null;
}> {
  const url = buildApiUrl('/memberships/current_user_role/');
  url.searchParams.set('workspace', workspaceId);
  if (email) url.searchParams.set('email', email);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const raw = await handleResponse<{
    role: WorkspaceRole;
    capabilities: {
      can_edit_script: boolean;
      can_edit_budget: boolean;
      can_lock_scenes: boolean;
      can_manage_members: boolean;
    };
    membership?: WorkspaceMembership | null;
  }>(res);

  return {
    role: raw.role,
    capabilities: {
      canEditScript: Boolean(raw.capabilities?.can_edit_script),
      canEditBudget: Boolean(raw.capabilities?.can_edit_budget),
      canLockScenes: Boolean(raw.capabilities?.can_lock_scenes),
      canManageMembers: Boolean(raw.capabilities?.can_manage_members),
    },
    membership: raw.membership,
  };
}

export async function fetchActivityLogs(
  workspaceId: string,
  department?: string,
  actionType?: string
): Promise<StudioActivityLog[]> {
  const url = buildApiUrl('/activity-logs/');
  url.searchParams.set('workspace', workspaceId);
  if (department && department !== 'ALL') {
    url.searchParams.set('department', department);
  }
  if (actionType && actionType !== 'ALL') {
    url.searchParams.set('action_type', actionType);
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<StudioActivityLog[]>(res);
}

export async function createActivityLog(
  data: Partial<StudioActivityLog> & { workspace: string; actor_name: string; action_type: string; description: string }
): Promise<StudioActivityLog> {
  const res = await fetch(`${API_BASE_URL}/activity-logs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<StudioActivityLog>(res);
}

// -------------------------------------------------------------
// AI Story Copilot & Script Coverage API
// -------------------------------------------------------------

export async function fetchCoverageReports(
  screenplayId: string,
  workspaceId?: string
): Promise<ScriptCoverageReport[]> {
  const url = buildApiUrl('/coverage-reports/');
  url.searchParams.set('screenplay', screenplayId);
  if (workspaceId) url.searchParams.set('workspace', workspaceId);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return handleResponse<ScriptCoverageReport[]>(res);
}

export async function generateCoverageReport(
  screenplayId: string,
  workspaceId?: string
): Promise<ScriptCoverageReport> {
  const res = await fetch(`${API_BASE_URL}/coverage-reports/generate_coverage/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ screenplay: screenplayId, workspace: workspaceId }),
  });
  return handleResponse<ScriptCoverageReport>(res);
}

export async function requestDialoguePunchUp(
  nodeId: string,
  tone: string = 'SHARPER'
): Promise<DialoguePunchUpSuggestion[]> {
  const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/punch_up_dialogue/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone }),
  });
  const data = await handleResponse<{ suggestions: DialoguePunchUpSuggestion[] }>(res);
  return data.suggestions || [];
}

export async function autoDetectSceneBreakdown(
  sceneId: string
): Promise<BreakdownSuggestion[]> {
  const res = await fetch(`${API_BASE_URL}/nodes/${sceneId}/auto_detect_breakdown/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await handleResponse<{ suggestions: BreakdownSuggestion[] }>(res);
  return data.suggestions || [];
}

// -------------------------------------------------------------
// Visual Node Graph (ComfyUI / React Flow) API
// -------------------------------------------------------------

export async function fetchWorkspaceGraph(workspaceId: string): Promise<WorkspaceGraphResponse> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/graph/`, {
    cache: 'no-store',
  });
  return handleResponse<WorkspaceGraphResponse>(res);
}

export async function syncWorkspaceGraph(
  workspaceId: string,
  payload: { nodes: GraphNodePayload[]; edges: GraphEdgePayload[] }
): Promise<{ status: string; nodes: GraphNodePayload[]; edges: GraphEdgePayload[] }> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/graph/sync/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ status: string; nodes: GraphNodePayload[]; edges: GraphEdgePayload[] }>(res);
}

export async function createGraphNode(
  workspaceId: string,
  data: Partial<GraphNodePayload>
): Promise<GraphNodePayload> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/nodes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<GraphNodePayload>(res);
}

export async function updateGraphNode(
  workspaceId: string,
  nodeId: string,
  data: Partial<GraphNodePayload>
): Promise<GraphNodePayload> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/nodes/${nodeId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<GraphNodePayload>(res);
}

export async function deleteGraphNode(workspaceId: string, nodeId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/nodes/${nodeId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete graph node failed [${res.status}]: ${errorBody}`);
  }
}

export async function createGraphEdge(
  workspaceId: string,
  data: Partial<GraphEdgePayload>
): Promise<GraphEdgePayload> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/edges/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<GraphEdgePayload>(res);
}

export async function deleteGraphEdge(workspaceId: string, edgeId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/edges/${edgeId}/`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete graph edge failed [${res.status}]: ${errorBody}`);
  }
}








