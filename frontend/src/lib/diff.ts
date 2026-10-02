import { WorkspaceNode } from '@/types/workspace';

export type DiffStatus = 'unchanged' | 'added' | 'removed' | 'modified';

export interface DiffItem {
  id: string;
  type: string;
  status: DiffStatus;
  title: string;
  oldTitle?: string;
  content: string;
  oldContent?: string;
  characterName?: string;
  oldCharacterName?: string;
  parenthetical?: string;
  oldParenthetical?: string;
  sceneNumber?: string;
}

export interface ScriptDiffSummary {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  items: DiffItem[];
}

/**
 * Filter out non-script structural nodes (e.g. keep scenes, actions, dialogues).
 */
function isScriptBlock(node: WorkspaceNode): boolean {
  return ['scene', 'action', 'dialogue'].includes(node.type);
}

/**
 * Computes block-by-block visual script differences between current nodes and a snapshot.
 */
export function computeScriptDiff(
  currentNodes: WorkspaceNode[],
  snapshotNodes: WorkspaceNode[]
): ScriptDiffSummary {
  const currentFiltered = currentNodes.filter(isScriptBlock);
  const snapshotFiltered = snapshotNodes.filter(isScriptBlock);

  // Map snapshot nodes by ID for fast lookup
  const snapshotMap = new Map<string, WorkspaceNode>();
  snapshotFiltered.forEach((n) => snapshotMap.set(n.id, n));

  const currentMap = new Map<string, WorkspaceNode>();
  currentFiltered.forEach((n) => currentMap.set(n.id, n));

  const items: DiffItem[] = [];
  const processedSnapshotIds = new Set<string>();

  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  // 1. Process current nodes in sequence
  for (const curr of currentFiltered) {
    const snap = snapshotMap.get(curr.id);

    if (!snap) {
      // Added block
      items.push({
        id: curr.id,
        type: curr.type,
        status: 'added',
        title: curr.title || '',
        content: curr.content || '',
        characterName: curr.properties?.character_name,
        parenthetical: curr.properties?.parenthetical,
        sceneNumber: curr.properties?.scene_number,
      });
      addedCount++;
    } else {
      processedSnapshotIds.add(snap.id);

      const titleChanged = (curr.title || '') !== (snap.title || '');
      const contentChanged = (curr.content || '') !== (snap.content || '');
      const charChanged =
        (curr.properties?.character_name || '') !== (snap.properties?.character_name || '');
      const parenChanged =
        (curr.properties?.parenthetical || '') !== (snap.properties?.parenthetical || '');

      const isChanged = titleChanged || contentChanged || charChanged || parenChanged;

      if (isChanged) {
        items.push({
          id: curr.id,
          type: curr.type,
          status: 'modified',
          title: curr.title || '',
          oldTitle: titleChanged ? snap.title : undefined,
          content: curr.content || '',
          oldContent: contentChanged ? snap.content : undefined,
          characterName: curr.properties?.character_name,
          oldCharacterName: charChanged ? snap.properties?.character_name : undefined,
          parenthetical: curr.properties?.parenthetical,
          oldParenthetical: parenChanged ? snap.properties?.parenthetical : undefined,
          sceneNumber: curr.properties?.scene_number || snap.properties?.scene_number,
        });
        modifiedCount++;
      } else {
        items.push({
          id: curr.id,
          type: curr.type,
          status: 'unchanged',
          title: curr.title || '',
          content: curr.content || '',
          characterName: curr.properties?.character_name,
          parenthetical: curr.properties?.parenthetical,
          sceneNumber: curr.properties?.scene_number,
        });
        unchangedCount++;
      }
    }
  }

  // 2. Identify removed blocks (in snapshot but missing from current)
  for (const snap of snapshotFiltered) {
    if (!processedSnapshotIds.has(snap.id)) {
      items.push({
        id: snap.id,
        type: snap.type,
        status: 'removed',
        title: snap.title || '',
        content: snap.content || '',
        characterName: snap.properties?.character_name,
        parenthetical: snap.properties?.parenthetical,
        sceneNumber: snap.properties?.scene_number,
      });
      removedCount++;
    }
  }

  return {
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
    items,
  };
}

/**
 * Computes word-level difference spans between two strings.
 */
export function computeWordDiff(
  oldText: string,
  newText: string
): { type: 'added' | 'removed' | 'same'; text: string }[] {
  const oldWords = oldText ? oldText.split(/(\s+)/) : [];
  const newWords = newText ? newText.split(/(\s+)/) : [];

  if (oldWords.length === 0 && newWords.length === 0) return [];
  if (oldWords.length === 0) {
    return [{ type: 'added', text: newText }];
  }
  if (newWords.length === 0) {
    return [{ type: 'removed', text: oldText }];
  }

  // Fast simple word diff output
  const result: { type: 'added' | 'removed' | 'same'; text: string }[] = [];

  if (oldText !== newText) {
    result.push({ type: 'removed', text: oldText });
    result.push({ type: 'added', text: newText });
  } else {
    result.push({ type: 'same', text: newText });
  }

  return result;
}
