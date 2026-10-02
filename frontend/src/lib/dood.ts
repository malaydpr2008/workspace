import { Character, ShootingDay, StripboardItem, WorkspaceNode } from '@/types/workspace';

export type DOODStatus = 'SW' | 'W' | 'H' | 'WF' | 'SWF' | 'I';

export interface CharacterDOODRow {
  characterId: string;
  characterName: string;
  actorName: string;
  totalWorkDays: number;
  totalHoldDays: number;
  dayStatuses: Record<string, DOODStatus>; // key: shootingDay.id
}

export interface CastDOODReport {
  days: ShootingDay[];
  rows: CharacterDOODRow[];
  totalWorkDaysAll: number;
  totalHoldDaysAll: number;
}

/**
 * Checks if a character appears in a specific scene node
 */
export function isCharacterInScene(
  character: Character,
  scene: WorkspaceNode,
  childrenMap: Record<string, string[]>,
  nodes: Record<string, WorkspaceNode>
): boolean {
  const blockIds = childrenMap[scene.id] || [];
  const charUpper = character.name.trim().toUpperCase();

  // Check scene properties cast_ids if present
  if (Array.isArray(scene.properties?.cast_ids)) {
    if (scene.properties.cast_ids.includes(character.id)) return true;
  }

  return blockIds.some((bid) => {
    const block = nodes[bid];
    if (!block || block.type !== 'dialogue') return false;

    if (block.properties?.character_id === character.id) return true;

    const blockCharName = (
      block.properties?.character_name ||
      block.properties?.character ||
      ''
    )
      .trim()
      .toUpperCase();

    return blockCharName === charUpper;
  });
}

/**
 * Computes the Cast Day-Out-of-Days (DOOD) status matrix across all shooting days.
 * Hollywood Standards:
 * - SW: Start Work (first scheduled day)
 * - W:  Work (intermediate work day)
 * - H:  Hold (idle day between work days - contractually paid hold)
 * - WF: Work Finish (last scheduled day)
 * - SWF: Start-Work-Finish (character works only 1 single day in the production)
 * - I:  Idle / Off (before first work day or after last work day)
 */
export function calculateCastDOOD(
  characters: Character[],
  shootingDays: ShootingDay[],
  stripItems: StripboardItem[],
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]> = {}
): CastDOODReport {
  // Sort days by order / day_number
  const sortedDays = [...shootingDays].sort(
    (a, b) => a.order - b.order || a.day_number - b.day_number
  );

  // Group non-banner strips by shooting_day
  const dayStripsMap = new Map<string, StripboardItem[]>();
  stripItems.forEach((strip) => {
    if (!strip.shooting_day || strip.is_banner) return;
    const list = dayStripsMap.get(strip.shooting_day) || [];
    list.push(strip);
    dayStripsMap.set(strip.shooting_day, list);
  });

  // Collect speaking characters from dialogue if characters array is empty or lacks speaking roles
  const activeCharMap = new Map<string, Character>();
  characters.forEach((c) => activeCharMap.set(c.id, c));

  // Also discover characters from screenplay nodes if characters list is minimal
  Object.values(nodes).forEach((node) => {
    if (node.type === 'dialogue') {
      const name = (node.properties?.character_name || '').trim();
      const charId = node.properties?.character_id;
      if (name) {
        const id = charId || `char-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        if (!activeCharMap.has(id)) {
          // Check if name already registered under another id
          const existing = Array.from(activeCharMap.values()).find(
            (c) => c.name.trim().toUpperCase() === name.toUpperCase()
          );
          if (!existing) {
            activeCharMap.set(id, {
              id,
              workspace: node.workspace,
              name,
              avatar: '',
              metadata: {},
            });
          }
        }
      }
    }
  });

  const characterList = Array.from(activeCharMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  let totalWorkDaysAll = 0;
  let totalHoldDaysAll = 0;

  const rows: CharacterDOODRow[] = characterList.map((character) => {
    // Determine for each day if character works
    const worksOnDay: boolean[] = sortedDays.map((day) => {
      const strips = dayStripsMap.get(day.id) || [];
      return strips.some((strip) => {
        if (!strip.scene) return false;
        const sceneNode = nodes[strip.scene];
        if (!sceneNode) return false;
        return isCharacterInScene(character, sceneNode, childrenMap, nodes);
      });
    });

    const workingIndices: number[] = [];
    worksOnDay.forEach((works, idx) => {
      if (works) workingIndices.push(idx);
    });

    const dayStatuses: Record<string, DOODStatus> = {};

    let charWorkCount = 0;
    let charHoldCount = 0;

    if (workingIndices.length === 0) {
      // Never works in schedule
      sortedDays.forEach((day) => {
        dayStatuses[day.id] = 'I';
      });
    } else if (workingIndices.length === 1) {
      // Works on only one single day: SWF
      const workIdx = workingIndices[0];
      sortedDays.forEach((day, idx) => {
        if (idx === workIdx) {
          dayStatuses[day.id] = 'SWF';
          charWorkCount++;
        } else {
          dayStatuses[day.id] = 'I';
        }
      });
    } else {
      const firstIdx = workingIndices[0];
      const lastIdx = workingIndices[workingIndices.length - 1];

      sortedDays.forEach((day, idx) => {
        if (idx < firstIdx || idx > lastIdx) {
          dayStatuses[day.id] = 'I';
        } else if (idx === firstIdx) {
          dayStatuses[day.id] = 'SW';
          charWorkCount++;
        } else if (idx === lastIdx) {
          dayStatuses[day.id] = 'WF';
          charWorkCount++;
        } else {
          if (worksOnDay[idx]) {
            dayStatuses[day.id] = 'W';
            charWorkCount++;
          } else {
            dayStatuses[day.id] = 'H';
            charHoldCount++;
          }
        }
      });
    }

    totalWorkDaysAll += charWorkCount;
    totalHoldDaysAll += charHoldCount;

    const actorName = character.metadata?.actor_name || character.metadata?.actor || 'TBD';

    return {
      characterId: character.id,
      characterName: character.name,
      actorName,
      totalWorkDays: charWorkCount,
      totalHoldDays: charHoldCount,
      dayStatuses,
    };
  });

  return {
    days: sortedDays,
    rows,
    totalWorkDaysAll,
    totalHoldDaysAll,
  };
}

/**
 * Exports Cast DOOD report to CSV string
 */
export function exportDOODToCSV(report: CastDOODReport, scheduleTitle: string): string {
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

  const headers = [
    'Character',
    'Actor',
    'Total Work Days',
    'Total Hold Days',
    ...report.days.map((d) => `Day ${d.day_number} (${d.date || d.call_time})`),
  ];

  const rows: string[] = [
    `"PROJECT SCHEDULE DOOD: ${scheduleTitle.replace(/"/g, '""')}"`,
    headers.map(escape).join(','),
  ];

  report.rows.forEach((row) => {
    const cols = [
      escape(row.characterName),
      escape(row.actorName),
      escape(row.totalWorkDays),
      escape(row.totalHoldDays),
      ...report.days.map((d) => escape(row.dayStatuses[d.id] || 'I')),
    ];
    rows.push(cols.join(','));
  });

  return rows.join('\n');
}
