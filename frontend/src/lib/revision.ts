import { RevisionColor, WorkspaceNode } from '@/types/workspace';

export interface RevisionColorConfig {
  id: RevisionColor;
  label: string;
  draftName: string;
  hex: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  dotColor: string;
}

export const REVISION_COLORS: RevisionColorConfig[] = [
  {
    id: 'WHITE',
    label: 'White',
    draftName: 'White (Production Draft)',
    hex: '#FFFFFF',
    textColor: 'text-slate-900',
    badgeBg: 'bg-white text-slate-900',
    badgeBorder: 'border-slate-300',
    dotColor: 'bg-white',
  },
  {
    id: 'BLUE',
    label: 'Blue',
    draftName: 'Blue Draft (1st Revision)',
    hex: '#93C5FD',
    textColor: 'text-blue-950',
    badgeBg: 'bg-blue-300 text-blue-950',
    badgeBorder: 'border-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    id: 'PINK',
    label: 'Pink',
    draftName: 'Pink Draft (2nd Revision)',
    hex: '#F472B6',
    textColor: 'text-pink-950',
    badgeBg: 'bg-pink-300 text-pink-950',
    badgeBorder: 'border-pink-400',
    dotColor: 'bg-pink-400',
  },
  {
    id: 'YELLOW',
    label: 'Yellow',
    draftName: 'Yellow Draft (3rd Revision)',
    hex: '#FDE047',
    textColor: 'text-yellow-950',
    badgeBg: 'bg-yellow-300 text-yellow-950',
    badgeBorder: 'border-yellow-400',
    dotColor: 'bg-yellow-400',
  },
  {
    id: 'GREEN',
    label: 'Green',
    draftName: 'Green Draft (4th Revision)',
    hex: '#86EFAC',
    textColor: 'text-emerald-950',
    badgeBg: 'bg-emerald-300 text-emerald-950',
    badgeBorder: 'border-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  {
    id: 'GOLDENROD',
    label: 'Goldenrod',
    draftName: 'Goldenrod Draft (5th Revision)',
    hex: '#FBBF24',
    textColor: 'text-amber-950',
    badgeBg: 'bg-amber-400 text-amber-950',
    badgeBorder: 'border-amber-500',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'BUFF',
    label: 'Buff',
    draftName: 'Buff Draft (6th Revision)',
    hex: '#FED7AA',
    textColor: 'text-orange-950',
    badgeBg: 'bg-orange-200 text-orange-950',
    badgeBorder: 'border-orange-300',
    dotColor: 'bg-orange-300',
  },
  {
    id: 'SALMON',
    label: 'Salmon',
    draftName: 'Salmon Draft (7th Revision)',
    hex: '#FCA5A5',
    textColor: 'text-rose-950',
    badgeBg: 'bg-rose-300 text-rose-950',
    badgeBorder: 'border-rose-400',
    dotColor: 'bg-rose-400',
  },
  {
    id: 'CHERRY',
    label: 'Cherry',
    draftName: 'Cherry Draft (8th Revision)',
    hex: '#F87171',
    textColor: 'text-red-950',
    badgeBg: 'bg-red-400 text-red-950',
    badgeBorder: 'border-red-500',
    dotColor: 'bg-red-500',
  },
];

export function getRevisionConfig(color: RevisionColor = 'WHITE'): RevisionColorConfig {
  return REVISION_COLORS.find((c) => c.id === color) || REVISION_COLORS[0];
}

/**
 * Get the alphanumeric scene number of a scene node.
 */
export function getSceneNumber(scene: WorkspaceNode, defaultIndex: number): string {
  if (scene.properties?.scene_number) {
    return String(scene.properties.scene_number);
  }
  const titleMatch = scene.title.match(/^(?:SCENE\s+)?([A-Z0-9]+)[\.\s\-]/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].toUpperCase();
  }
  return String(defaultIndex + 1);
}

/**
 * Calculate alphanumeric locked scene number when inserting after an existing scene.
 * Examples:
 * - Insert before first scene (idx = -1): "A1"
 * - Insert after Scene 1: "1A"
 * - Insert after Scene 1A: "1B"
 * - Insert after Scene 2: "2A"
 */
export function calculateLockedSceneNumber(
  existingScenes: WorkspaceNode[],
  insertAfterIndex: number
): string {
  if (existingScenes.length === 0) return '1';

  if (insertAfterIndex < 0) {
    // Inserting before first scene: A1, B1, C1...
    const firstNum = getSceneNumber(existingScenes[0], 0);
    const baseMatch = firstNum.match(/(\d+)/);
    const baseNum = baseMatch ? baseMatch[1] : '1';

    let prefixChar = 'A';
    const usedPrefixes = new Set<string>();
    existingScenes.forEach((s, idx) => {
      const num = getSceneNumber(s, idx);
      const m = num.match(/^([A-Z]+)\d+$/);
      if (m && m[1]) usedPrefixes.add(m[1].toUpperCase());
    });

    while (usedPrefixes.has(prefixChar) && prefixChar <= 'Z') {
      prefixChar = String.fromCharCode(prefixChar.charCodeAt(0) + 1);
    }
    return `${prefixChar}${baseNum}`;
  }

  const prevScene = existingScenes[insertAfterIndex];
  const prevNum = getSceneNumber(prevScene, insertAfterIndex);

  // Parse prevNum, e.g. "1", "1A", "A1", "12B"
  const match = prevNum.match(/^([A-Z]*)(\d+)([A-Z]*)$/i);
  if (!match) {
    return `${prevNum}A`;
  }

  const prefix = match[1] || '';
  const num = match[2];
  const suffix = match[3] || '';

  // Suffixes for this base number
  const siblingSuffixes = new Set<string>();
  existingScenes.forEach((s, idx) => {
    const sNum = getSceneNumber(s, idx);
    const m = sNum.match(new RegExp(`^${prefix}${num}([A-Z]*)$`, 'i'));
    if (m && m[1]) {
      siblingSuffixes.add(m[1].toUpperCase());
    }
  });

  let nextSuffix = suffix ? String.fromCharCode(suffix.toUpperCase().charCodeAt(0) + 1) : 'A';
  while (siblingSuffixes.has(nextSuffix) && nextSuffix <= 'Z') {
    nextSuffix = String.fromCharCode(nextSuffix.charCodeAt(0) + 1);
  }

  return `${prefix}${num}${nextSuffix}`;
}
