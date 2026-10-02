import { WorkspaceNode, Character, BreakdownElement, BreakdownCategory, Shot } from '@/types/workspace';

export interface CharacterDialogueStat {
  characterName: string;
  characterId?: string;
  lineCount: number;
  wordCount: number;
  linePercentage: number;
  wordPercentage: number;
  color: string;
}

export interface ScenePacingStat {
  sceneId: string;
  sceneNumber: number;
  sceneTitle: string;
  actionWordCount: number;
  dialogueWordCount: number;
  totalWordCount: number;
  actionRatio: number;
  dialogueRatio: number;
  dialogueLinesCount: number;
  shotsCount: number;
  estimatedDurationSeconds: number;
  pacingCategory: 'FAST_ACTION' | 'BALANCED' | 'DIALOGUE_HEAVY' | 'SLOW_BURN';
  intensityScore: number; // 0 - 100
}

export interface DepartmentStat {
  category: BreakdownCategory;
  label: string;
  count: number;
  totalMentions: number;
  percentage: number;
  elementNames: string[];
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface ScreenplayAnalytics {
  totalScenes: number;
  totalDialogueLines: number;
  totalDialogueWords: number;
  totalActionWords: number;
  totalWords: number;
  estimatedRuntimeMinutes: number;
  totalProductionElements: number;
  totalShots: number;
  totalShotDurationSeconds: number;
  characterStats: CharacterDialogueStat[];
  scenePacingStats: ScenePacingStat[];
  departmentStats: DepartmentStat[];
  shotTypeDistribution: DistributionItem[];
  lensDistribution: DistributionItem[];
  movementDistribution: DistributionItem[];
}

const CHARACTER_PALETTE = [
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#64748b', // slate-500
];

const DEPARTMENT_LABELS: Record<BreakdownCategory, string> = {
  PROP: 'Props',
  COSTUME: 'Costumes',
  VFX: 'Visual Effects',
  SFX: 'Sound Effects',
  LOCATION: 'Locations',
  VEHICLE: 'Vehicles',
  MAKEUP: 'Hair & Makeup',
};

function countWords(str: string): number {
  if (!str) return 0;
  const words = str.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function calculateScreenplayAnalytics(
  nodes: WorkspaceNode[],
  characters: Record<string, Character>,
  elements: BreakdownElement[],
  shots: Shot[]
): ScreenplayAnalytics {
  const scenes = nodes.filter((n) => n.type === 'scene');
  const dialogueBlocks = nodes.filter((n) => n.type === 'dialogue');
  const actionBlocks = nodes.filter((n) => n.type === 'action');

  // Total words
  let totalDialogueWords = 0;
  let totalActionWords = 0;

  actionBlocks.forEach((a) => {
    totalActionWords += countWords(a.content);
  });

  // Character dialogue calculations
  const charMap: Record<
    string,
    { lineCount: number; wordCount: number; characterId?: string }
  > = {};

  dialogueBlocks.forEach((d) => {
    const rawName = (d.properties?.character_name || 'UNKNOWN').trim().toUpperCase();
    const characterId = d.properties?.character_id;
    const words = countWords(d.content);
    totalDialogueWords += words;

    if (!charMap[rawName]) {
      charMap[rawName] = { lineCount: 0, wordCount: 0, characterId };
    }
    charMap[rawName].lineCount += 1;
    charMap[rawName].wordCount += words;
    if (characterId && !charMap[rawName].characterId) {
      charMap[rawName].characterId = characterId;
    }
  });

  const totalWords = totalDialogueWords + totalActionWords;

  // Build character stats array
  const characterStats: CharacterDialogueStat[] = Object.entries(charMap)
    .map(([characterName, data], idx) => {
      const linePercentage =
        dialogueBlocks.length > 0
          ? Math.round((data.lineCount / dialogueBlocks.length) * 100)
          : 0;
      const wordPercentage =
        totalDialogueWords > 0
          ? Math.round((data.wordCount / totalDialogueWords) * 100)
          : 0;

      return {
        characterName,
        characterId: data.characterId,
        lineCount: data.lineCount,
        wordCount: data.wordCount,
        linePercentage,
        wordPercentage,
        color: CHARACTER_PALETTE[idx % CHARACTER_PALETTE.length],
      };
    })
    .sort((a, b) => b.wordCount - a.wordCount);

  // Scene pacing stats
  const scenePacingStats: ScenePacingStat[] = scenes.map((scene, idx) => {
    // Child blocks under this scene
    const sceneBlocks = nodes.filter((n) => n.parent === scene.id);
    let sceneActionWords = 0;
    let sceneDialogueWords = 0;
    let sceneDialogueLines = 0;

    sceneBlocks.forEach((b) => {
      if (b.type === 'action') {
        sceneActionWords += countWords(b.content);
      } else if (b.type === 'dialogue') {
        sceneDialogueWords += countWords(b.content);
        sceneDialogueLines += 1;
      }
    });

    const sceneTotalWords = sceneActionWords + sceneDialogueWords;
    const actionRatio =
      sceneTotalWords > 0 ? sceneActionWords / sceneTotalWords : 0.5;
    const dialogueRatio =
      sceneTotalWords > 0 ? sceneDialogueWords / sceneTotalWords : 0.5;

    // Scene shots
    const sceneShots = shots.filter((s) => s.scene === scene.id);
    const shotDurationSum = sceneShots.reduce(
      (acc, s) => acc + (Number(s.duration_seconds) || 0),
      0
    );

    // If shots exist, use real shot runtime; otherwise approximate: ~200 words = 60s
    const estimatedDurationSeconds =
      shotDurationSum > 0
        ? shotDurationSum
        : Math.max(15, Math.round((sceneTotalWords / 200) * 60));

    let pacingCategory: ScenePacingStat['pacingCategory'] = 'BALANCED';
    if (actionRatio >= 0.7) {
      pacingCategory = 'FAST_ACTION';
    } else if (dialogueRatio >= 0.7) {
      pacingCategory = 'DIALOGUE_HEAVY';
    } else if (sceneTotalWords < 50) {
      pacingCategory = 'SLOW_BURN';
    }

    // Intensity score: higher words + higher action ratio -> higher kinetic intensity
    const intensityScore = Math.min(
      100,
      Math.round((sceneTotalWords / 250) * 50 + actionRatio * 50)
    );

    return {
      sceneId: scene.id,
      sceneNumber: idx + 1,
      sceneTitle: scene.title || `Scene ${idx + 1}`,
      actionWordCount: sceneActionWords,
      dialogueWordCount: sceneDialogueWords,
      totalWordCount: sceneTotalWords,
      actionRatio: Math.round(actionRatio * 100) / 100,
      dialogueRatio: Math.round(dialogueRatio * 100) / 100,
      dialogueLinesCount: sceneDialogueLines,
      shotsCount: sceneShots.length,
      estimatedDurationSeconds,
      pacingCategory,
      intensityScore,
    };
  });

  // Department Breakdown
  const totalElements = elements.length;
  const categories: BreakdownCategory[] = [
    'PROP',
    'COSTUME',
    'VFX',
    'SFX',
    'LOCATION',
    'VEHICLE',
    'MAKEUP',
  ];

  const departmentStats: DepartmentStat[] = categories.map((cat) => {
    const catElements = elements.filter((e) => e.category === cat);
    const totalMentions = catElements.reduce(
      (acc, e) => acc + (e.block_ids?.length || 0),
      0
    );
    const percentage =
      totalElements > 0
        ? Math.round((catElements.length / totalElements) * 100)
        : 0;

    return {
      category: cat,
      label: DEPARTMENT_LABELS[cat] || cat,
      count: catElements.length,
      totalMentions,
      percentage,
      elementNames: catElements.map((e) => e.name),
    };
  });

  // Camera Shot Type Distribution
  const shotTypeCounts: Record<string, number> = {};
  const lensCounts: Record<string, number> = {};
  const movementCounts: Record<string, number> = {};
  let totalShotDurationSeconds = 0;

  shots.forEach((s) => {
    totalShotDurationSeconds += Number(s.duration_seconds) || 0;

    const st = (s.shot_type || 'STANDARD').toUpperCase().trim();
    shotTypeCounts[st] = (shotTypeCounts[st] || 0) + 1;

    const lens = (s.lens || 'Unspecified').trim();
    lensCounts[lens] = (lensCounts[lens] || 0) + 1;

    const movement = (s.movement || 'Static').trim();
    movementCounts[movement] = (movementCounts[movement] || 0) + 1;
  });

  const shotTypeDistribution: DistributionItem[] = Object.entries(shotTypeCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: shots.length > 0 ? Math.round((count / shots.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const lensDistribution: DistributionItem[] = Object.entries(lensCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: shots.length > 0 ? Math.round((count / shots.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const movementDistribution: DistributionItem[] = Object.entries(movementCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: shots.length > 0 ? Math.round((count / shots.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Runtime estimation (industry standard rule: ~1 page = 1 min = ~200-250 words)
  const wordsRuntime = Math.round((totalWords / 200) * 10) / 10;
  const shotsRuntime = Math.round((totalShotDurationSeconds / 60) * 10) / 10;
  const estimatedRuntimeMinutes = shotsRuntime > 0 ? shotsRuntime : Math.max(1, wordsRuntime);

  return {
    totalScenes: scenes.length,
    totalDialogueLines: dialogueBlocks.length,
    totalDialogueWords,
    totalActionWords,
    totalWords,
    estimatedRuntimeMinutes,
    totalProductionElements: totalElements,
    totalShots: shots.length,
    totalShotDurationSeconds,
    characterStats,
    scenePacingStats,
    departmentStats,
    shotTypeDistribution,
    lensDistribution,
    movementDistribution,
  };
}
